import { uses,names,localDate,plusDays } from './plan-initial.mjs';

const norm=x=>String(x??'').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
const inProject=x=>x.projectId===1;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const active=x=>['active','activo','activa'].includes(norm(x));
const open=x=>['open','pendiente','abierto','abierta'].includes(norm(x));
const numeric=(a,b)=>a!==null&&a!==undefined&&Number(a)===b;
const report=(state,date)=>{
 const project=state.projects.find(x=>x.id===1);
 const start=plusDays(date,-(new Date(date+'T00:00:00Z').getUTCDay()+6)%7);
 const end=plusDays(start,6);
 const within=value=>{const d=value?.length===10?value:localDate(value);return d>=start&&d<=end;};
 const tasks=state.tasks.filter(inProject), movements=state.movements.filter(inProject), incidents=state.incidents.filter(inProject);
 return {project:project.name,weekStart:start,weekEnd:end,status:project.status,progress:project.progress,
  completed:tasks.filter(t=>t.status==='COMPLETED'&&within(t.completedAt??t.dueDate)).length,
  openTasks:tasks.filter(t=>t.status!=='COMPLETED').length,entries:movements.filter(x=>x.type==='ENTRY'&&within(x.occurredAt)).length,
  usages:movements.filter(x=>x.type==='USAGE'&&within(x.occurredAt)).length,incidents:incidents.filter(x=>within(x.reportedAt)).length,
  openIncidents:incidents.filter(x=>x.status!=='RESOLVED').length};
};
export function verify(e) {
 if(!e.initial_state||!e.final_state) return {status:'blocked',outcome_correct:null,verified_cases:[],failure_reason:e.failure_reason??'No hay estado del mock'};
 const {initial_state:before,final_state:after,experiment_id:id,condition}=e;
 const day=e.started_at?localDate(e.started_at):null;
 const material=before.materials.find(x=>x.id===4);
 const checks=e.cases.map((item,i)=>{
  const {answer:a,observation,blocked}=item;
  let expected, correct=false, details={};
  if(blocked)return {case:i+1,correct:null,blocked};
  switch(id){
   case 'EC01':{
    const ids=new Set(before.movements.map(x=>x.id));
    const added=after.movements.filter(x=>!ids.has(x.id));
    const order=x=>x.map(z=>z.join(':')).sort();
    expected=uses;
    const actual=added.filter(x=>inProject(x)&&x.type==='USAGE').map(x=>[x.materialName,x.quantity]);
    const stockChecks=before.materials.filter(inProject).map(m=>({name:m.name,expected:m.stock-uses.filter(([n])=>n===m.name).reduce((n,[,q])=>n+q,0),actual:after.materials.find(x=>x.id===m.id)?.stock}));
    correct=added.length===6&&same(order(expected),order(actual))&&stockChecks.every(x=>x.expected===x.actual);
    details={actual,stockChecks};break;
   }
   case 'EC02':{
    const roster=before.workers.filter(inProject).map(x=>x.id).sort((a,b)=>a-b);
    const records=after.attendance.filter(x=>inProject(x)&&x.attendanceDate===day);
    const present=records.filter(x=>x.status==='PRESENT').map(x=>x.workerId).sort((a,b)=>a-b);
    expected=roster;correct=records.length===12&&same(roster,present);details={date:day,present,total:records.length};break;
   }
   case 'EC03':{
    expected=item.expected_state.tasks.filter(x=>inProject(x)&&['PENDING','IN_PROGRESS'].includes(x.status)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
    correct=norm(a.title)===norm(expected.title)&&a.due===expected.dueDate;break;
   }
   case 'EC04':{
    expected=report(before,day);
    correct=active(a.status)&&active(expected.status)&&numeric(a.progress,expected.progress)&&a.weekStart===expected.weekStart&&a.weekEnd===expected.weekEnd&&new URL(observation.url).pathname==='/projects/1/reports'&&observation.aria.includes('Semana del');break;
   }
   case 'EC05':{
    expected=before.movements.filter(x=>inProject(x)&&x.type==='USAGE'&&x.materialName===names[i]).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0];
    if(expected) correct=numeric(a.quantity,expected.quantity)&&a.date===localDate(expected.occurredAt)&&norm(a.responsible)===norm(expected.registeredByName)&&/(uso|salida|usage)/.test(norm(a.origin));
    break;
   }
   case 'EC06':{
    expected=report(before,day);
    const fields=Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,k==='status'?active(a[k])&&active(v):typeof v==='number'?numeric(a[k],v):norm(a[k])===norm(v)]));
    const mode=condition==='A'?!e.urls.some(url=>url.endsWith('/reports')):e.downloads.some(x=>x.pdf&&x.name.endsWith(expected.weekStart+'.pdf'));
    correct=Object.values(fields).every(Boolean)&&mode;
    details={fields,method_verified:mode,downloaded:e.downloads};break;
   }
   case 'EC07':{
    const p=item.period;
    expected=p?.incident;
    correct=Boolean(expected&&p.injected_at&&Date.parse(item.at)>=Date.parse(p.injected_at)&&open(a.status)&&norm(a.description)===norm(expected.description)&&observation.aria.includes(expected.description));
    details={period_opened_at:p?.opened??null,injected_at:p?.injected_at??null,period_closed_at:p?.closed??null,response_at:item.at,detection_seconds:correct?(Date.parse(item.at)-Date.parse(p.injected_at))/1000:null};break;
   }
   case 'EC09':{
    expected={stock:material.stock,unit:material.unit};
    correct=numeric(a.stock,material.stock)&&['varilla','varillas'].includes(norm(a.unit))&&new URL(observation.url).pathname==='/projects/1/materials';break;
   }
  }
  return {case:i+1,correct,answer:a,expected,details,at:item.at,evidence_path:e.id+'/case-'+(i+1)+'.png'};
 });
 const full=checks.length===e.caseCount&&!checks.some(x=>x.blocked);
 const status=full?'executed':e.started_at?'incomplete':'blocked';
 return {status,outcome_correct:full?checks.every(x=>x.correct):null,verified_cases:checks,
  failure_reason:e.failure_reason??checks.find(x=>x.blocked)?.blocked??(full&&checks.some(x=>!x.correct)?'Uno o más objetivos no coinciden con la referencia independiente.':null)};
}


