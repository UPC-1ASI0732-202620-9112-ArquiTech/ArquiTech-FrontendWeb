import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root=dirname(fileURLToPath(import.meta.url));
export const read=(p)=>JSON.parse(readFileSync(join(root,p),'utf8'));
const plan=read('../../../participants/plan.json');
const profiles=new Map(read('../../../participants/profiles.json').profiles.map(p=>[p.id,p]));
const completed=new Set(read('../autonomous-web-20261110/verification.json').filter(r=>r.outcome_correct).map(r=>[r.experiment_id,r.profile_id,r.condition].join('/')));
export const groups=plan.experiments.filter(e=>e.platform==='web').flatMap(e=>e.assignments.map(a=>{
 const sequence=a.condition ? [a.condition] : a.order.split('-');
 return {experiment:e.id,profile:profiles.get(a.participant_id),order:a.order??a.condition,conditions:sequence.filter(c=>!completed.has([e.id,a.participant_id,c].join('/')))};
})).filter(g=>g.conditions.length);

export const uses=[
 ['Fierro corrugado 3/8"',2],['Cemento',3],['Pintura',1],['Arena gruesa',2],['Ladrillos',10],['Fierro corrugado 3/8"',4]
];
export const names=['Arena gruesa','Cemento','Fierro corrugado 3/8"','Ladrillos','Pintura'];
export const endpoints={EC01:'materials',EC02:'attendance',EC03:'tasks',EC04:'materials',EC05:'materials/movements',EC06:'materials',EC07:'incidents',EC09:'@projects'};
export const tasks={
 EC01:'Registra estos seis usos por separado en Torre Residencial Norte, respetando cantidad y unidad del inventario: '+uses.map(([name,qty])=>qty+' de '+name).join(', ')+'. No combines operaciones. Confirma si completaste los seis.',
 EC02:'Registra como presentes a los doce trabajadores del proyecto en la jornada de hoy, sin duplicarlos. Confirma si se completó la jornada.',
 EC03:'En cada uno de los cinco conjuntos de tareas, identifica la tarea abierta (pendiente o en curso) con el vencimiento más antiguo. Entrega title (título exacto) y due (fecha ISO YYYY-MM-DD). Cada entrega abre el siguiente caso.',
 EC04:'Consulta el estado de Torre Residencial Norte, el porcentaje de avance y el periodo del reporte semanal. Abre el reporte. Entrega status, progress (número), weekStart y weekEnd (fechas ISO).',
 EC05:'Resuelve las cinco discrepancias de la misma obra. En cada caso busca el uso más reciente del material indicado y entrega quantity (número), date (YYYY-MM-DD), origin (tipo de movimiento) y responsible (nombre si figura, null si falta). Cada entrega abre el siguiente caso.',
 EC06:'Entrega un reporte estructurado de Torre Residencial Norte para la semana actual. Campos: project, weekStart, weekEnd (ISO), status, progress, completed (tareas completadas en la semana), openTasks (tareas abiertas en total), entries y usages (movimientos de la semana), incidents (incidencias de la semana), openIncidents (no resueltas en total). Usa los datos que puedas ver y conserva los campos desconocidos como null.',
 EC07:'Vigila Torre Residencial Norte durante dos periodos de ensayo. Busca una nueva incidencia de severidad alta y anota description y status exactos cuando la detectes. Antes de avanzar al segundo periodo entrega la respuesta del primero. Puedes esperar el fin del periodo y recargar la vista si la información no se actualiza.',
 EC09:'Como primera tarea, consulta el inventario de Torre Residencial Norte e indica stock (número) y unit de fierro corrugado de 3/8".'
};
export function objective(experiment,condition) {
 return tasks[experiment]+(experiment==='EC06' ? condition==='A'
  ? ' Consolida manualmente consultando los módulos de origen y entrega el resumen con tus cálculos. El reporte ya consolidado no forma parte de este método.'
  : ' Usa el flujo de reporte asistido y descarga también el PDF.' : '');
}
export const caseCount=experiment=>({EC03:5,EC05:5,EC07:2}[experiment]??1);
export const detail=(experiment,i)=>experiment==='EC05'?'Material de la discrepancia '+(i+1)+': '+names[i]+'.':null;
export const localDate=stamp=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stamp));
export const plusDays=(stamp,days)=>new Date(Date.parse(stamp.slice(0,10)+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
export function seedCase(db,experiment,index,day) {
 if(experiment!=='EC03') return db;
 for(const [i,task] of db.tasks.filter(x=>x.projectId===1).entries()) {
   task.status=i===index ? 'PENDING' : i===(index+1)%5 ? 'COMPLETED':'IN_PROGRESS';
   task.dueDate=plusDays(day,i===index ? -8 : i===(index+1)%5 ? -12 : i-3);
 }
 return db;
}


