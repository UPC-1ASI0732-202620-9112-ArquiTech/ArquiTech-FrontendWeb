import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const scope=process.argv[2]??'git';
if(!['git','release','local','all'].includes(scope))throw Error('Scope: git, release, local or all');
const readCsv=async name=>(await readFile(join(root,name),'utf8')).trimEnd().split(/\r?\n/).slice(1).map(line=>
 [...line.matchAll(/"((?:[^"]|"")*)"(?=,|$)/g)].map(m=>m[1].replaceAll('""','"')));
async function verify(path,bytes,sha256){
 if((await stat(path)).size!==Number(bytes))throw Error('Tamaño distinto: '+path);
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(path))hash.update(chunk);
 if(hash.digest('hex')!==sha256)throw Error('SHA-256 distinto: '+path);
}
if(process.argv[3]) {
 const assets=await readCsv('assets.csv');
 for(const [name,bytes,sha256] of assets)await verify(join(process.argv[3],name),bytes,sha256);
 console.log('Paquetes verificados: '+assets.length);
}
const selected=(await readCsv('inventory.csv')).filter(row=>scope==='all'||row[3]===scope);
for(const [name,bytes,sha256] of selected)await verify(join(root,'../agent-runs',name),bytes,sha256);
console.log('Archivos verificados ('+scope+'): '+selected.length);
