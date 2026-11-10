import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { groups,root,read,localDate } from './plan.mjs';

const observed=groups.flatMap(g=>g.conditions.map(c=>[g.experiment,g.profile.id,c].join('-')))
 .filter(id=>existsSync(join(root,id,'result.json'))).map(id=>read(id+(existsSync(join(root,id,'result-verified.json'))?'/result-verified.json':'/result.json')));
const pct=(numerator,denominator)=>({numerator,denominator,percent:denominator?100*numerator/denominator:null});
const delta=(a,b)=>(Date.parse(a)-Date.parse(b))/1000;
const median=xs=>{
 const sorted=xs.filter(Number.isFinite).sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
 return sorted.length ? sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2 : null;
};
const reference=(rows,limit)=>pct(rows.filter(r=>{
 const first=r.verified_cases[0];
 return first?.correct===true&&delta(first.at,r.started_at)<=limit;
}).length,rows.length);
const selected=(ex,c)=>observed.filter(r=>r.experiment_id===ex&&r.condition===c&&r.started_at);
const recordings=(r)=>{
 const path=join(root,r.id,'observations.jsonl');
 return existsSync(path)?readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
};
const results={scope:'Descriptive diagnostics of the synthetic cohort. Pilot excluded because its objectives or timing protocol differ.',conditions:{}};
for(const c of ['A','B']){
 const ec01=selected('EC01',c);
 const movementCases=ec01.flatMap(r=>r.verified_cases.filter(x=>x.details?.observed_commit_actions>0));
 const firstAttempts=movementCases.filter(x=>x.details.first_attempt_correct);
 const ec02=selected('EC02',c);
 const attendance=ec02.filter(r=>{
  const evidence=read(r.id+'/verification-input.json');
  return evidence.final_state?.attendance?.some(a=>a.projectId===1&&a.attendanceDate===localDate(r.started_at))||
   recordings(r).some(o=>o.kind==='action'&&/Guardar cambios|Guardar asistencia de ensayo/.test(o.action.name??''));
 });
 const complete=attendance.filter(r=>{
  const evidence=read(r.id+'/verification-input.json');
  const roster=evidence.initial_state.workers.filter(w=>w.projectId===1).map(w=>w.id);
  const present=evidence.final_state.attendance.filter(a=>a.projectId===1&&a.attendanceDate===localDate(r.started_at)&&a.status);
  return roster.every(id=>present.some(a=>a.workerId===id));
 });
 const ec06=selected('EC06',c);
 const reports=ec06.filter(r=>r.verified_cases.some(v=>v.answer&&Object.keys(v.answer).length>0));
 const fields=['project','weekStart','weekEnd','status','progress','completed','openTasks','entries','usages','incidents','openIncidents'];
 const reportHasFields=r=>fields.every(k=>r.verified_cases[0].answer[k]!==null&&r.verified_cases[0].answer[k]!==undefined&&r.verified_cases[0].answer[k]!=='');
 const completeReports=reports.filter(reportHasFields);
 const protocolReports=reports.filter(r=>r.verified_cases[0].details?.method_verified);
 const ec07=selected('EC07',c);
 const injections=ec07.flatMap(r=>recordings(r).filter(o=>o.kind==='independent_injection'&&o.injected_at));
 const detections=ec07.flatMap(r=>r.verified_cases.map(x=>x.details?.detection_seconds).filter(Number.isFinite));
 const ec04=selected('EC04',c);
 const ec09=selected('EC09',c);
 results.conditions[c]={
  M01_lab_correct_at_first_observed_submit:pct(firstAttempts.length,movementCases.length),
  M02_lab_attendance_completeness:pct(complete.length,attendance.length),
  M03_lab_correct_reference_within_120s:reference(selected('EC03',c),120),
  M04_lab_correct_within_180s_help_not_measured:reference(ec04,180),
  EC05_lab_correct_reference_within_120s:reference(selected('EC05',c),120),
  EC06_correct_report_median_elapsed_seconds:median(ec06.filter(r=>r.outcome_correct===true).map(r=>r.duration_seconds)),
  EC06_correct_report_n:ec06.filter(r=>r.outcome_correct===true).length,
  EC06_all_submitted_reports_with_fields:pct(completeReports.length,reports.length),
  M07_lab_required_fields_present:pct(protocolReports.filter(reportHasFields).length,protocolReports.length),
  EC07_simulated_injections:injections.length,
  EC07_confirmed_within_600s:detections.filter(s=>s<=600).length,
  EC07_detection_median_seconds:median(detections),
  M10_lab_correct_within_600s_help_not_measured:reference(ec09,600)
 };
}
results.models=Object.fromEntries([...new Set(observed.map(r=>r.model??'gpt-6.1-sol'))].map(model=>[model, ['A','B'].map(condition=>({condition,executed:observed.filter(r=>(r.model??'gpt-6.1-sol')===model&&r.condition===condition&&r.status==='executed').length}))]));
const validManual=selected('EC06','A').filter(r=>r.outcome_correct===true);
const validAssisted=selected('EC06','B').filter(r=>r.outcome_correct===true);
const pairedReports=validManual.map(a=>[a,validAssisted.find(b=>b.profile_id===a.profile_id&&(b.model??'gpt-6.1-sol')===(a.model??'gpt-6.1-sol'))]).filter(([,b])=>b);
results.EC06_same_model_correct_pairs={
 n:pairedReports.length,
 profiles:pairedReports.map(([a])=>a.profile_id),
 median_A_elapsed_seconds:median(pairedReports.map(([a])=>a.duration_seconds)),
 median_B_elapsed_seconds:median(pairedReports.map(([,b])=>b.duration_seconds)),
 comparison:'Descriptive values only for paired correct reports of the same model; not a business improvement estimate.'
};
results.not_estimated={

 M04:'Help requests were not separately observed or measured.',
 M05:'The reference scenario is synthetic and only the cohort diagnostic is available.',
 M06:'Report timing is model/controller wall time. No validated operational reduction estimate.',
 M08:'The mock requires reload and uses compressed periods. Unconfirmed events are censored before the full calendar window.',
 M09:'Offline/mobile conditions were outside this web run.',
 M10:'Help was not separately measured and newcomers are synthetic profiles.',
 M11:'Qualified prospects and acquisition analytics are unavailable.',
 F01:'No operational time and rate inputs.',
 F02:'No direct preparation or validation cost inputs.',
 F03:'No campaign costs or qualified prospect counts.'
};
writeFileSync(join(root,'metrics.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));




