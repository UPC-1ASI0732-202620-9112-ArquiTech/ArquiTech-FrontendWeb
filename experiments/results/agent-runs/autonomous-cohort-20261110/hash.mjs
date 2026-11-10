import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root } from './plan.mjs';
const digest=async path=>{
 const hash=createHash('sha256');
 for await(const part of createReadStream(path))hash.update(part);
 return hash.digest('hex');
};
async function files(path,prefix=''){
 const out=[];
 for(const entry of await readdir(path,{withFileTypes:true})){
  const key=prefix+entry.name;
  if(entry.isDirectory())out.push(...await files(join(path,entry.name),key+'/'));
  else if(entry.isFile()&&key!=='sha256.txt')out.push(key);
 }
 return out;
}
const manifest=join(root,'sha256.txt');
if(process.argv.includes('--write')){
 const entries=[];
 for(const name of (await files(root)).sort())entries.push(await digest(join(root,name))+'  '+name);
 await writeFile(manifest,entries.join('\n')+'\n');
}
const hashes=(await readFile(manifest,'utf8')).trimEnd().split(/\r?\n/);
for(const line of hashes){
 const expected=line.slice(0,64);
 const file=line.slice(66);
 if(await digest(join(root,file))!==expected)throw Error('SHA-256 mismatch for '+file);
}
console.log('Verified SHA-256: '+hashes.length+' files');
