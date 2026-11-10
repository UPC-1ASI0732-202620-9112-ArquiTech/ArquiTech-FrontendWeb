import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const lines = (file) => readFileSync(join(root,file),'utf8').trim().split('\n').map(line=>JSON.parse(line));
const completed = lines('completed.jsonl').sort((a,b)=>a.id.localeCompare(b.id));
const observations = lines('observations.jsonl');
const projectId = 1;
const materialId = 4;
const date = (value) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const isOpen = (status) => ['OPEN','PENDIENTE'].includes(status.toUpperCase());

function verify(row, {before,after,downloads,final}) {
  const {answer,experiment_id} = row;
  const material = before.materials.find(x=>x.id===materialId);
  const project = before.projects.find(x=>x.id===projectId);
  const weekDay = new Date(date(row.started_at)+'T00:00:00Z');
  weekDay.setUTCDate(weekDay.getUTCDate() - (weekDay.getUTCDay()+6)%7);
  const weekStart = weekDay.toISOString().slice(0,10);
  weekDay.setUTCDate(weekDay.getUTCDate()+6);
  const weekEnd = weekDay.toISOString().slice(0,10);
  switch (experiment_id) {
    case 'EC01': {
      const ids = new Set(before.movements.map(x=>x.id));
      const added = after.movements.filter(x=>!ids.has(x.id));
      const stock = after.materials.find(x=>x.id===materialId).stock;
      const match = added.length===1 && added[0].projectId===projectId && added[0].materialId===materialId && added[0].type==='USAGE' && added[0].quantity===2;
      return {correct:match && stock===material.stock-2, checked:{newMovements:added, stockBefore:material.stock, stockAfter:stock}};
    }
    case 'EC02': {
      const day = date(row.started_at);
      const expected = before.workers.filter(x=>x.projectId===projectId).map(x=>x.id).sort((a,b)=>a-b);
      const current = after.attendance.filter(x=>x.projectId===projectId && x.attendanceDate===day);
      const present = current.filter(x=>x.status==='PRESENT').map(x=>x.workerId).sort((a,b)=>a-b);
      return {correct:expected.length===12 && current.length===expected.length && JSON.stringify(expected)===JSON.stringify(present),
        checked:{day,expected,present,total:current.length,unique:new Set(current.map(x=>x.workerId)).size}};
    }
    case 'EC03': {
      const expected = before.tasks.filter(x=>x.projectId===projectId && ['PENDING','IN_PROGRESS'].includes(x.status)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
      return {correct:answer.title===expected.title && answer.due===expected.dueDate, checked:{expected}};
    }
    case 'EC04': {
      const observedReport = new URL(final.url).pathname==='/projects/1/reports' && final.aria.includes('Semana del');
      return {correct:['ACTIVE','ACTIVO'].includes(answer.status.toUpperCase()) && project.status==='ACTIVE' && answer.progress===project.progress && answer.week===weekStart+'/'+weekEnd && observedReport,
        checked:{status:project.status,progress:project.progress,weekStart,weekEnd,observedReport}};
    }
    case 'EC05': {
      const latest = before.movements.filter(x=>x.projectId===projectId && x.materialId===materialId && x.type==='USAGE').sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0];
      return {correct:answer.quantity===latest.quantity && answer.responsible===latest.registeredByName && answer.date===date(latest.occurredAt), checked:{latest}};
    }
    case 'EC06': {
      const file = downloads.find(x=>x.pdf && x.name.endsWith(weekStart+'.pdf') && x.name.includes('torre-residencial-norte'));
      const rendered = existsSync(join(root,row.id,'pdf-render-1.png'));
      return {correct:Boolean(file && rendered), checked:{downloads,rendered,weekStart,weekEnd,scope:'File signature, project/date in filename and successful first-page render. Visual content check documented separately.'}};
    }
    case 'EC07': {
      const injected = after.incidents.find(x=>x.id===99007 && x.projectId===projectId && x.reportedAt===row.injected_at);
      const correct = Boolean(injected && !before.incidents.some(x=>x.id===injected.id) && injected.severity==='HIGH' && injected.status==='OPEN' &&
        answer.description===injected.description && isOpen(answer.status) && ['HIGH','ALTA'].includes(answer.severity.toUpperCase()) && final.aria.includes(injected.description));
      return {correct,checked:{injected,detectionSeconds:correct ? (Date.parse(row.ended_at)-Date.parse(row.injected_at))/1000 : null}};
    }
    case 'EC09': {
      return {correct:answer.stock===material.stock && answer.unit===material.unit && new URL(final.url).pathname==='/projects/1/materials',
        checked:{stock:material.stock,unit:material.unit,inventory:final.url}};
    }
    default: throw Error('Unknown experiment');
  }
}

const results = completed.map(row=>{
  const state=JSON.parse(readFileSync(join(root,row.id,'verification-input.json'),'utf8'));
  for (const path of [row.evidence_path,row.trace_path,row.id+'/initial.png']) {
    if (!existsSync(join(root,path))) throw Error('Missing evidence: '+path);
  }
  const verdict=verify(row,state);
  const actionErrors=observations.filter(x=>x.id===row.id && x.error).map(x=>x.error);
  return {...row,outcome_correct:verdict.correct,attempt_count:1,help_requested:null,
    action_errors:actionErrors,failure_reason:verdict.correct ? null : 'La comprobación independiente no coincidió con el objetivo.',
    detection_seconds:verdict.checked.detectionSeconds ?? null,verification:verdict.checked};
});
if (new Set(results.map(x=>x.id)).size!==16 || results.length!==16) throw Error('Expected 16 distinct pilot cases');
const columns=['experiment_id','profile_id','role','condition','task_id','started_at','ended_at','duration_seconds','outcome_correct','attempt_count','help_requested','failure_reason','model_steps','detection_seconds','evidence_path','trace_path'];
const csv=(x)=>'"'+String(x??'not_measured').replaceAll('"','""')+'"';
writeFileSync(join(root,'outcomes.csv'),[columns.join(','),...results.map(r=>columns.map(k=>csv(r[k])).join(','))].join('\n')+'\n');
writeFileSync(join(root,'verification.json'),JSON.stringify(results,null,2)+'\n');
for(const r of results) console.log(r.id,r.outcome_correct,r.duration_seconds,r.model_steps,r.detection_seconds,r.action_errors.length);
