import { chromium } from 'playwright';
import { appendFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const base = 'http://127.0.0.1:4200';
const queue = join(root, 'queue');
const sessions = new Map();
const baseline = {EC01:'materials',EC02:'attendance',EC03:'tasks',EC04:'',EC05:'materials/movements',EC06:'reports',EC07:'incidents',EC09:''};
const plan = JSON.parse(await readFile(join(root, '../../../participants/plan.json')));
const profiles = JSON.parse(await readFile(join(root, '../../../participants/profiles.json'))).profiles;
const browser = await chromium.launch();
await mkdir(queue, { recursive: true });
let running = true;

const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('arquitech.mock-db')));
const iso = () => new Date().toISOString();
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (name, row) => appendFile(join(root,name), JSON.stringify(row)+'\n');
async function observe(page) {
  const aria = await page.locator('body').ariaSnapshot({ timeout: 4000 });
  const fields = await page.locator('input, select, textarea').evaluateAll(elements => elements.filter(e => e.getClientRects().length && e.type !== 'hidden').map(e => ({
    tag:e.tagName.toLowerCase(), type:e.type, label:e.labels?.[0]?.innerText || e.getAttribute('aria-label') || e.placeholder || '',
    value:e.value, checked:e.type === 'checkbox' ? e.checked : undefined, disabled:e.disabled,
    options:e.tagName === 'SELECT' ? [...e.options].map(o=>o.label) : undefined,
  })));
  return { url:page.url(), aria, fields };
}
async function open(cmd) {
  const {id, experiment, condition, profile, objective} = cmd;
  if (sessions.has(id)) throw Error('Already started');
  const assignment = plan.experiments.find(item => item.id === experiment)?.assignments.find(item=>item.participant_id===profile);
  if (!assignment || (assignment.condition && assignment.condition!==condition)) throw Error('Not assigned');
  const actor = profiles.find(item=>item.id===profile);
  const context = await browser.newContext({locale:'es-PE', timezoneId:'America/Lima',viewport:{width:1280,height:900},serviceWorkers:'block'});
  try {
    await context.route('**/*', route => new URL(route.request().url()).origin===base ? route.continue() : route.abort());
    await context.tracing.start({screenshots:true,snapshots:true,sources:false});
    const page = await context.newPage();
    page.setDefaultTimeout(3500);
    const folder = join(root,id);
    await mkdir(folder, {recursive:true});
    const downloads = [];
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('download', download => {
      const name = download.suggestedFilename();
      downloads.push({name, saved:download.saveAs(join(folder,name))});
    });
    await page.goto(base+'/login');
    const email = actor.role==='contractor' ? 'contratante@arquitech.demo' : 'supervisor@arquitech.demo';
    await page.getByText(email, {exact:true}).first().click();
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('**/projects');
    const before = await state(page);
    const route = condition==='B' ? 'experiments/'+experiment : baseline[experiment];
    const url = base+'/projects/1'+(route ? '/'+route : '');
    let injectedAt = null;
    if (experiment==='EC07') {
      injectedAt = iso();
      await page.evaluate((at) => {
        const db = JSON.parse(localStorage.getItem('arquitech.mock-db'));
        db.incidents.push({id:99007,projectId:1,reportedByUserId:1,type:'UNSAFE_CONDITION',description:'Cierre de seguridad: desprendimiento de plataforma en sector Delta.',severity:'HIGH',status:'OPEN',reportedAt:at,resolvedAt:null});
        localStorage.setItem('arquitech.mock-db',JSON.stringify(db));
      },injectedAt);
    }
    const started = iso();
    await page.goto(url);
    await wait(700);
    const observation = await observe(page);
    await page.screenshot({path:join(folder,'initial.png')});
    sessions.set(id,{...cmd, actor, context, page, before, observation, folder, started, injectedAt, downloads, errors, step:0});
    await log('observations.jsonl',{id,experiment,condition,profile,objective,at:started,injectedAt,kind:'initial',observation});
    return {profile:actor,objective,observation};
  } catch (error) { await context.close(); throw error; }
}
async function action(cmd,s) {
  if (++s.step > 60 || Date.now()-Date.parse(s.started)>25*60*1000) throw Error('Task limit');
  const at=iso();
  let error=null;
  try {
    if (cmd.kind==='observe') await wait(450);
    else {
      const targets=cmd.role
        ? s.page.getByRole(cmd.role, cmd.name===undefined ? {} : {name:cmd.name,exact:cmd.exact ?? true})
        : s.page.locator('input:visible:not([type=hidden]), select:visible, textarea:visible');
      const target=cmd.index===undefined ? targets : targets.nth(cmd.index);
      if (cmd.kind==='click') await target.click();
      if (cmd.kind==='fill') await target.fill(cmd.value);
      if (cmd.kind==='select') await target.selectOption({label:cmd.value});
      if (cmd.kind==='check') await target.check();
      await wait(cmd.settle ?? 350);
    }
  } catch(caught) { error=String(caught); }
  const observation=await observe(s.page);
  await log('observations.jsonl',{id:s.id,experiment:s.experiment,condition:s.condition,profile:s.profile,objective:s.objective,step:s.step,at,kind:'model_action',decision:cmd.why,action:cmd,previous:s.observation,observation,error});
  s.observation=observation;
  return {observation,error};
}
async function finish(cmd,s) {
  const ended=iso();
  const after=await state(s.page);
  await s.page.screenshot({path:join(s.folder,'final.png'),fullPage:true,timeout:5000});
  const downloads=[];
  for (const download of s.downloads) {
    try {
      await download.saved;
      const bytes=await readFile(join(s.folder,download.name));
      downloads.push({name:download.name,bytes:bytes.length,pdf:bytes.subarray(0,5).toString()==='%PDF-'});
    } catch(error) { downloads.push({name:download.name,error:String(error)}); }
  }
  const data={before:s.before,after,downloads,final:s.observation};
  for (const db of [data.before,data.after]) if (db) { delete db.users; delete db.sessions; }
  await writeFile(join(s.folder,'verification-input.json'),JSON.stringify(data,null,2));
  await s.context.tracing.stop({path:join(s.folder,'trace.zip')});
  await s.context.close();
  sessions.delete(s.id);
  const row={id:s.id,experiment_id:s.experiment,condition:s.condition,profile_id:s.profile,role:s.actor.role,task_id:s.experiment+'-pilot',objective:s.objective,started_at:s.started,ended_at:ended,duration_seconds:(Date.parse(ended)-Date.parse(s.started))/1000,model_steps:s.step,injected_at:s.injectedAt,answer:cmd.answer,error:s.errors,evidence_path:s.id+'/final.png',trace_path:s.id+'/trace.zip'};
  await log('completed.jsonl',row);
  return row;
}
try {
  await writeFile(join(root,'ready.txt'),iso());
  while(running) {
    const files=(await readdir(queue)).filter(file=>file.endsWith('.request')).sort();
    for (const file of files) {
      const request=join(queue,file);
      let result;
      try {
        const cmd=JSON.parse(await readFile(request));
        const s=sessions.get(cmd.id);
        if (cmd.kind==='start') result=await open(cmd);
        else if (cmd.kind==='stop') { running=false; result={stopped:true}; }
        else if (!s) throw Error('No active task '+cmd.id);
        else if (cmd.kind==='finish') result=await finish(cmd,s);
        else result=await action(cmd,s);
      } catch (error) { result={error:String(error),stack:error.stack}; await log('controller-errors.jsonl',{at:iso(),file,error:String(error)}); }
      await writeFile(request+'.tmp',JSON.stringify(result));
      await rename(request+'.tmp',request.replace('.request','.response'));
      await rename(request,request+'.done');
    }
    if (running) await wait(125);
  }
} finally { await browser.close(); }
