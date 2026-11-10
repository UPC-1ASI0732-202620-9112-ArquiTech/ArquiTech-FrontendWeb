import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile,readdir,writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join,relative } from 'node:path';
import { groups,supplementaryGroups,root } from './plan.mjs';
import { verify } from './verify.mjs';

const require=createRequire(import.meta.url);
const {yauzl}=require(join(root,'../../../../node_modules/playwright-core/lib/utilsBundle.js'));
const digest=(s)=>createHash('sha256').update(s).digest('hex');
const exists=async(path)=>{try{await readFile(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const load=async(path)=>JSON.parse(await readFile(path,'utf8'));
const ids=(g)=>g.conditions.map(c=>[...(g.supplement?['SUP']:[]),g.experiment,g.profile.id,c].join('-'));
const origins=await Promise.all([...groups,...supplementaryGroups].flatMap(ids).map(async(id)=>{
 const folder=join(root,id);
 const resultPath=join(folder,'result.json');
 if(!await exists(resultPath)) return null;
 const revised=join(folder,'result-verified.json');
 const result=await load(await exists(revised)?revised:resultPath);
 const evidence=await load(join(folder,'verification-input.json'));
 const checked=verify(evidence);
 if(checked.status!==result.status||checked.outcome_correct!==result.outcome_correct)throw Error('Reverification discrepancy: '+id);
 const trace=join(folder,'trace.zip');
 const values=await new Promise((resolve,reject)=>{
  const origins=new Set();
  let requests=0;
  yauzl.open(trace,{lazyEntries:true},(error,zip)=>{
   if(error)return reject(error);
   zip.on('error',reject);
   zip.on('end',()=>resolve({requests,origins:[...origins].sort()}));
   zip.on('entry',entry=>{
    if(!entry.fileName.endsWith('.network'))return zip.readEntry();
    zip.openReadStream(entry,(streamError,stream)=>{
     if(streamError)return reject(streamError);
     let data='';
     stream.setEncoding('utf8');stream.on('data',chunk=>data+=chunk);stream.on('error',reject);
     stream.on('end',()=>{
      try{
       for(const line of data.split('\n').filter(Boolean)){
        const rec=JSON.parse(line);
        if(rec.type!=='resource-snapshot')continue;
        const url=new URL(rec.snapshot.request.url);
        if(url.protocol==='http:'||url.protocol==='https:'){origins.add(url.origin);requests++;}
       }
       zip.readEntry();
      }catch(err){reject(err);}
     });
    });
   });
   zip.readEntry();
  });
 });
 if(values.origins.some(o=>o!=='http://127.0.0.1:4200'))throw Error('Unexpected traced origin in '+id);
 return {id,model:result.model??'gpt-6.1-sol',status:result.status,started_at:result.started_at,ended_at:result.ended_at,initial_state_sha256:evidence.initial_state?digest(JSON.stringify(evidence.initial_state)):null,...values};
}));
const active=origins.filter(Boolean);
const byId=new Map(active.map(row=>[row.id,row]));
const pairs=groups.filter(g=>g.conditions.length===2).map(g=>{
 const [a,b]=ids(g).map(id=>byId.get(id));
 return {experiment:g.experiment,profile:g.profile.id,order:g.order,recorded:Boolean(a&&b),same_model:a&&b?a.model===b.model:null, observed_order:a?.ended_at&&b?.started_at?Date.parse(a.ended_at)<=Date.parse(b.started_at):null,
  same_initial_state:a&&b?.initial_state_sha256&&a.initial_state_sha256?a.initial_state_sha256===b.initial_state_sha256:null};
});
await writeFile(join(root,'audit.json'),JSON.stringify({verified_runs:active,paired_initial_state:pairs},null,2)+'\n');
const historical=await Promise.all(['web-20261110-0032','autonomous-web-20261110'].map(async folder=>{
 const base=join(root,'..',folder);
 const lines=(await readFile(join(base,'sha256.txt'),'utf8')).trim().split(/\r?\n/);
 for(const line of lines){
  const [hash,path]=line.split('  ');
  if(digest(await readFile(join(base,path)))!==hash)throw Error('Historical integrity discrepancy: '+folder+'/'+path);
 }
 return {folder,hashes_verified:lines.length};
}));
console.log(JSON.stringify({verified:active.length,unexpected_origins:0,pairs: pairs.filter(p=>p.recorded).length,matching_seed_pairs:pairs.filter(p=>p.same_initial_state===true).length,mixed_model_pairs:pairs.filter(p=>p.same_model===false).length,order_deviations:pairs.filter(p=>p.observed_order===false).length,historical}));



