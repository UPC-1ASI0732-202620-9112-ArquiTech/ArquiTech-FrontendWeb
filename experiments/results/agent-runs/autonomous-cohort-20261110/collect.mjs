import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { groups,supplementaryGroups,root,read } from './plan.mjs';

const expected=groups.flatMap(g=>g.conditions.map(condition=>({
 experiment_id:g.experiment,profile_id:g.profile.id,role:g.profile.role,condition,order:g.order,
 id:[g.experiment,g.profile.id,condition].join('-')
})));
const pilot=read('../autonomous-web-20261110/verification.json');
const archives=['infra-initial','infra-mcp-policy','infra-ec01-early-submit','quota-gpt-6.1-sol','infra-ec07-injector','retry-ec07-early-exit'];
function resultFor(id) {
 const historical_attempts=archives.filter(folder=>existsSync(join(root,folder,id,'result.json'))).map(folder=>folder+'/'+id+'/result.json');
 if(existsSync(join(root,id,'result.json'))) {
  const result=read(id+(existsSync(join(root,id,'result-verified.json'))?'/result-verified.json':'/result.json'));
  return {...result,model:result.model??'gpt-6.1-sol',historical_attempts:historical_attempts.join(' | ')};
 }
 const archive='quota-gpt-6.1-sol/';
 if(!existsSync(join(root,archive,id,'result.json')))return null;
 const result=read(archive+id+'/result.json');
 return {...result,model:'gpt-6.1-sol',historical_attempts:historical_attempts.join(' | '),failure_reason:'Límite de uso del proveedor para gpt-6.1-sol',evidence_path:archive+result.evidence_path,trace_path:archive+result.trace_path,
  verified_cases:result.verified_cases.map(c=>({...c,evidence_path:c.evidence_path?archive+c.evidence_path:null}))};
}
const recorded=expected.map(e=>resultFor(e.id)).filter(Boolean);
const results=new Map(recorded.map(r=>[r.id,r]));
const rows=expected.map(e=>results.get(e.id)??{...e,status:'not_run',outcome_correct:null});
const columns=['id','experiment_id','profile_id','role','condition','order','model','status','task_id','started_at','ended_at','duration_seconds','browser_action_seconds','explicit_wait_seconds','initial_model_wait_seconds','outcome_correct','attempt_count','historical_attempts','help_requested','steps','failure_reason','evidence_path','trace_path'];
const csv=(v)=>'"'+String(v??'not_measured').replaceAll('"','""')+'"';
writeFileSync(join(root,'outcomes.csv'),[columns.join(','),...rows.map(r=>columns.map(k=>csv(r[k])).join(','))].join('\n')+'\n');
const additional=supplementaryGroups.flatMap(g=>g.conditions.map(c=>['SUP',g.experiment,g.profile.id,c].join('-')))
 .map(resultFor).filter(Boolean);
writeFileSync(join(root,'supplementary.csv'),[columns.join(','),...additional.map(r=>columns.map(k=>csv(r[k])).join(','))].join('\n')+'\n');
const cases=[...recorded,...additional].flatMap(r=>r.verified_cases.map(c=>({id:r.id,experiment_id:r.experiment_id,profile_id:r.profile_id,condition:r.condition,...c})));
const caseColumns=['id','experiment_id','profile_id','condition','case','correct','period_opened_at','injected_at','response_at','period_closed_at','detection_seconds','evidence_path','blocked'];
writeFileSync(join(root,'cases.csv'),[caseColumns.join(','),...cases.map(c=>caseColumns.map(k=>csv(c[k]??c.details?.[k])).join(','))].join('\n')+'\n');
const summary={
 planned:expected.length,pilot_retained:pilot.length,recorded:recorded.length,started:recorded.filter(r=>r.started_at).length,
 fully_executed:recorded.filter(r=>r.status==='executed').length,correct:recorded.filter(r=>r.outcome_correct===true).length,
 incorrect:recorded.filter(r=>r.outcome_correct===false).length,
 incomplete:recorded.filter(r=>r.status==='incomplete').length,blocked:recorded.filter(r=>r.status==='blocked').length,not_run:expected.length-recorded.length,
 models: Object.fromEntries([...new Set(recorded.map(r=>r.model))].map(m=>[m,{recorded:recorded.filter(r=>r.model===m).length,executed:recorded.filter(r=>r.model===m&&r.status==='executed').length}])),
 cases_recorded:cases.length,cases_correct:cases.filter(c=>c.correct===true).length,supplementary_recorded:additional.length,supplementary_correct:additional.filter(r=>r.outcome_correct===true).length,
 results: [...new Set(expected.map(e=>e.experiment_id))].flatMap(experiment_id=>['A','B'].map(condition=>{
  const batch=rows.filter(r=>r.experiment_id===experiment_id&&r.condition===condition);
  const prior=pilot.filter(r=>r.experiment_id===experiment_id&&r.condition===condition);
  return {experiment_id,condition,pilot:prior.length,planned:batch.length,started:batch.filter(r=>r.started_at).length,
   executed:batch.filter(r=>r.status==='executed').length,correct:batch.filter(r=>r.outcome_correct===true).length,
   incorrect:batch.filter(r=>r.outcome_correct===false).length,incomplete:batch.filter(r=>r.status==='incomplete').length,
   blocked:batch.filter(r=>r.status==='blocked').length,not_run:batch.filter(r=>r.status==='not_run').length};
 }))
};
writeFileSync(join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));




