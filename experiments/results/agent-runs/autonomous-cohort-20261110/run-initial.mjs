import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { root,groups,endpoints,objective,caseCount,detail,seedCase,localDate } from './plan-initial.mjs';
import { verify } from './verify-initial.mjs';

const base='http://127.0.0.1:4200';
const key='arquitech.mock-db';
const model='gpt-6.1-sol';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const stamp=()=>new Date().toISOString();
const save=(folder,file,data)=>writeFile(join(folder,file),JSON.stringify(data,null,2)+'\n');
const log=(folder,file,data)=>appendFile(join(folder,file),JSON.stringify(data)+'\n');
const db=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const safe=state=>{ const {users,sessions,...rest}=state; return rest; };
const textForModel=aria=>aria.split('\n').filter(l=>!l.includes('/url:') && !/^\s*- (cell|columnheader|rowgroup|generic):?/.test(l)).slice(0,165).join('\n');
const now=performance.now.bind(performance);

async function run(browser,g,condition) {
 const {experiment,profile}=g;
 const id=[experiment,profile.id,condition].join('-');
 const folder=join(root,id);
 const queue=join(folder,'queue');
 try { const prior=JSON.parse(await readFile(join(folder,'result.json'))); return prior; } catch(error){if(error.code!=='ENOENT') throw error;}
 await mkdir(queue,{recursive:true});
 const context=await browser.newContext({locale:'es-PE',timezoneId:'America/Lima',viewport:{width:1280,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await context.tracing.start({screenshots:true,snapshots:true,sources:false});
 const page=await context.newPage();
 page.setDefaultTimeout(4500);
 const urls=new Set();
 const errors=[];
 const downloads=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('framenavigated',frame=>{if(frame===page.mainFrame()) urls.add(frame.url());});
 page.on('download',download=>{
  const name=download.suggestedFilename();
  downloads.push({name,promise:download.saveAs(join(folder,name)).then(async()=>{
   const file=await readFile(join(folder,name)); return {name,bytes:file.length,pdf:file.subarray(0,5).toString()==='%PDF-'};
  }).catch(error=>({name,error:String(error)}))});
 });
 const cases=[];
 let started=null, ended=null, startedMono=null, actionMs=0, waitMs=0, modelReadyMs=null, steps=0, child=null, fail=null, done=false, prior=null, fixture=null, period=null, injection=null, actor=null;
 let authAt=null, clock=null, lastAction=null;
 const stepLimit=80;
 let childExit;
 const entry=condition==='A'&&endpoints[experiment]==='@projects'?base+'/projects':base+'/projects/1/'+(condition==='B'?'experiments/'+experiment:endpoints[experiment]);
 const scenario=objective(experiment,condition);
 const caseNumber=()=>cases.length+1;
 async function observe() {
  const aria=await page.locator('body').ariaSnapshot({timeout:4500});
  const fields=await page.locator('input, select, textarea').evaluateAll(xs=>xs.filter(e=>e.getClientRects().length&&e.type!=='hidden').map((e,i)=>({
   i,type:e.type,label:e.labels?.[0]?.innerText||e.getAttribute('aria-label')||e.placeholder||'',value:e.value,disabled:e.disabled,
   options:e.tagName==='SELECT'?[...e.options].map(o=>o.label):undefined
  })));
  const observation={url:page.url(),aria,fields};
  prior=observation;
  urls.add(page.url());
  return observation;
 }
 const visible=obs=>({case:caseNumber(),goal:detail(experiment,cases.length),aria:textForModel(obs.aria),fields:obs.fields});
 async function showFixture() {
  const state=seedCase(structuredClone(fixture),experiment,cases.length,clock);
  if(experiment==='EC03') await page.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,state]);
  if(experiment==='EC03'&&cases.length) await page.goto(entry);
  return safe(state);
 }
 async function openPeriod() {
  const index=cases.length;
  const type=index?'EQUIPMENT_FAILURE':'UNSAFE_CONDITION';
  const description=(index?'Parada preventiva por sobrecalentamiento en sector':'Cierre de acceso por desprendimiento en sector')+' '+profile.id+'-'+(index+1)+'.';
  const opened=stamp();
  period={opened,planned_delay_ms:index?3500:2200,incident:null,closed:null};
  const current=period;
  injection=(async()=>{
   await wait(current.planned_delay_ms);
   if(done) return;
   const record={id:99100+index,projectId:1,reportedByUserId:1,type,description,severity:'HIGH',status:'OPEN',reportedAt:stamp(),resolvedAt:null};
   await actor.evaluate(([k,value])=>{
    const state=JSON.parse(localStorage.getItem(k));
    state.incidents.push(value); localStorage.setItem(k,JSON.stringify(state));
   },[key,record]);
   current.incident=record; current.injected_at=stamp();
   await log(folder,'observations.jsonl',{kind:'independent_injection',period:index+1,visible_page:page.url(),...current});
  })();
 }
 async function processRequest(method,args) {
  if(!started){started=stamp();startedMono=now();modelReadyMs=Date.parse(started)-Date.parse(authAt);}
  const at=stamp(), start=now();
  if(method==='observe') {
   if(experiment==='EC07'&&!period) await openPeriod();
   const observation=await observe();
   await log(folder,'observations.jsonl',{at,case:caseNumber(),kind:'observe',observation});
   return visible(observation);
  }
  if(method==='wait_period') {
   if(experiment!=='EC07') return {error:'No active observation period.'};
   if(!period) await openPeriod();
   await injection; waitMs+=now()-start;
   const observation=await observe();
   await log(folder,'observations.jsonl',{at,case:caseNumber(),kind:'wait_period',observation});
   return {...visible(observation),periodElapsed:true};
  }
  if(method==='interact') {
   if(!prior) return {error:'Observe the UI before taking any action.'};
   for(const action of args.actions??[]) {
    const stepStarted=now(), stepAt=stamp(), previous=prior;
    if(++steps>stepLimit) {done=true;fail='Límite de acciones';return {error:fail};}
    let error=null;
    try {
     if(action.op==='reload') { await page.reload(); await wait(450); }
     else {
      let target=action.field!==undefined?page.locator('input:visible:not([type=hidden]),select:visible,textarea:visible').nth(action.field)
       :page.getByRole(action.role,action.name===undefined?{}:{name:action.name,exact:true});
      if(action.index!==undefined) target=target.nth(action.index);
      if(action.op==='click') await target.click();
      else if(action.op==='fill') await target.fill(action.value);
      else if(action.op==='select') await target.selectOption({label:action.value});
      else if(action.op==='check') await target.check();
      else throw Error('Unsupported action');
      await wait(310);
     }
    } catch(e) {error=String(e);errors.push(error);}
    const observation=await observe();
    const elapsed=now()-stepStarted;
    actionMs+=elapsed; lastAction=stamp();
    await log(folder,'observations.jsonl',{at:stepAt,case:caseNumber(),kind:'action',step:steps,action,previous,observation,error,elapsed_ms:elapsed});
    if(error) return {...visible(observation),error};
   }
   return visible(prior);
  }
  if(method==='submit') {
   if(!prior) return {error:'Observe the browser before submitting.'};
   if(experiment==='EC07'&&period&&!period.incident&&!args.blocked) return {error:'The current period has not elapsed yet.'};
   if(period){period.closed=stamp();await injection;}
   const observation=await observe();
   const item={number:caseNumber(),answer:args.answer??{},blocked:args.blocked??null,at,period:period?structuredClone(period):null,observation,expected_state:caseFixture};
   cases.push(item);
   await page.screenshot({path:join(folder,'case-'+cases.length+'.png'),fullPage:true,timeout:7000});
   await log(folder,'observations.jsonl',{at,case:cases.length,kind:'submit',answer:item.answer,blocked:item.blocked,period:item.period,observation});
   if(args.blocked||cases.length>=caseCount(experiment)){done=true;return {completed:true};}
   caseFixture=await showFixture();
   if(experiment==='EC07') await openPeriod();
   return visible(await observe());
  }
  return {error:'Unknown method'};
 }
 let caseFixture;
 try {
  await page.goto(base+'/login');
  const email=profile.role==='contractor'?'contratante@arquitech.demo':'supervisor@arquitech.demo';
  await page.getByText(email,{exact:true}).first().click();
  await page.locator('form button[type=submit]').click();
  await page.waitForURL('**/projects');
  fixture=await db(page); clock=localDate(stamp());
  caseFixture=await showFixture();
  await page.goto(entry); await wait(650);
  await page.screenshot({path:join(folder,'initial.png'),timeout:7000});
  if(experiment==='EC07'){actor=await context.newPage();await actor.goto(base+'/favicon.ico');}
  authAt=stamp();
  const modelEvents=join(folder,'model.jsonl'),modelErrors=join(folder,'model-stderr.log');
  const cli=process.env.ARQUITECH_CODEX_JS;
  if(!cli) throw Error('ARQUITECH_CODEX_JS unavailable');
  const config=(field,val)=>['-c','mcp_servers.browser.'+field+'='+JSON.stringify(val)];
  const cliArgs=[cli,'-a','never',...config('command',process.execPath),...config('args',[join(root,'browser-mcp.mjs'),queue]),
    ...config('default_tools_approval_mode','approve'),'-c','mcp_servers.browser.tool_timeout_sec=135','-c','model_reasoning_effort="low"','exec','--ignore-user-config','--ephemeral','--sandbox','read-only','--json','-m',model,'-'];
  child=spawn(process.execPath,cliArgs,{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});
  child.on('error',e=>{childExit={error:String(e)};});
  child.on('close',(code,signal)=>{childExit={code,signal};});
  child.stdout.on('data',data=>{void appendFile(modelEvents,data);});
  child.stderr.on('data',data=>{void appendFile(modelErrors,data);});
  child.stdin.on('error',e=>errors.push(String(e)));
  child.stdin.end('Opera solamente con las herramientas MCP browser. No uses terminal, archivos, web ni otros conectores. Observa la interfaz primero y elige cada acción a partir de lo que muestra. La herramienta recibe el nombre exacto del control visible, su rol y, si hay varios, el índice desde cero. Para selecciones usa la etiqueta visible de la opción. Registra una breve justificación por acción. Usa submit para cada caso. No inventes datos. Finaliza en cuanto submit confirme completed. Perfil: '+JSON.stringify({role:profile.role,digital_experience:profile.digital_experience,navigation_preference:profile.navigation_preference,persona_context:profile.persona_context})+'\nObjetivo: '+scenario);
  const deadline=Date.now()+420000;
  while(!done&&Date.now()<deadline){
   for(const request of (await readdir(queue)).filter(name=>name.endsWith('.request'))){
    const path=join(queue,request);
    let response;
    try { const call=JSON.parse(await readFile(path)); response=await processRequest(call.method,call.args); }
    catch(error){errors.push(String(error));response={error:String(error)};}
    const output=path.replace(/\.request$/,'.response');
    await writeFile(output+'.tmp',JSON.stringify(response));await rename(output+'.tmp',output);await rename(path,path+'.done');
   }
   if(childExit&&!done){fail='Modelo terminó antes de entregar todas las respuestas: '+JSON.stringify(childExit);break;}
   if(!done) await wait(125);
  }
  if(!done&&!fail)fail='Tiempo límite del recorrido';
 } catch(error) {fail=String(error);errors.push(fail);}
 ended=stamp();
 const elapsed=startedMono===null?null:now()-startedMono;
 if(child&&!childExit){for(let i=0;i<50&&!childExit;i++)await wait(100);if(!childExit)child.kill();}
 done=true;
 if(injection) await injection.catch(e=>errors.push(String(e)));
 const finalState=await db(page).then(safe).catch(()=>null);
 const artifacts=await Promise.all(downloads.map(x=>x.promise));
 await page.screenshot({path:join(folder,'final.png'),fullPage:true,timeout:7000}).catch(e=>errors.push(String(e)));
 await context.tracing.stop({path:join(folder,'trace.zip')}).catch(e=>errors.push(String(e)));
 await context.close();
 const evidence={id,experiment_id:experiment,profile_id:profile.id,role:profile.role,condition,order:g.order,task_id:experiment+'-cohort',objective:scenario,
  started_at:started,ended_at:started?ended:null,duration_seconds:elapsed===null?null:elapsed/1000,browser_action_seconds:actionMs/1000,explicit_wait_seconds:waitMs/1000,initial_model_wait_seconds:modelReadyMs===null?null:modelReadyMs/1000,
  steps,errors,failure_reason:fail,help_requested:null,attempt_count:started?1:null,caseCount:caseCount(experiment),cases,initial_state:fixture?safe(fixture):null,final_state:finalState,downloads:artifacts,urls:[...urls],lastAction,
  evidence_path:id+'/final.png',trace_path:id+'/trace.zip'};
 await save(folder,'verification-input.json',evidence);
 const result={...Object.fromEntries(Object.entries(evidence).filter(([k])=>!['cases','initial_state','final_state'].includes(k))),...verify(evidence)};
 await save(folder,'result.json',result);
 await log(root,'execution.jsonl',{at:stamp(),id,condition,status:result.status,correct:result.outcome_correct,steps,duration_seconds:result.duration_seconds,failure_reason:result.failure_reason});
 console.log(id,result.status,result.outcome_correct,steps,Math.round(result.duration_seconds??0));
 return result;
}

const filtered=process.env.ARQUITECH_EXPERIMENTS?.split(',')??null;
const wanted=groups.filter(g=>!filtered||filtered.includes(g.experiment));
const max=Number(process.env.ARQUITECH_MAX_GROUPS??wanted.length);
const concurrency=Number(process.env.ARQUITECH_WORKERS??6);
const browser=await chromium.launch();
try {
  const work=wanted.slice(0,max);
 if(process.env.ARQUITECH_PREFLIGHT==='1'){
  const probes=groups.filter(g=>g.experiment==='EC09').slice(0,2);
  const results=await Promise.all(probes.map(g=>run(browser,g,g.conditions[0])));
  if(results.some(r=>!r.started_at)) throw Error('The browser MCP preflight did not receive an observation');
 }
 let i=0;
 await Promise.all(Array.from({length:Math.min(concurrency,work.length)},async()=>{
  while(i<work.length){
   const group=work[i++];
   for(const condition of group.conditions) await run(browser,group,condition);
  }
 }));
} finally {await browser.close();}




