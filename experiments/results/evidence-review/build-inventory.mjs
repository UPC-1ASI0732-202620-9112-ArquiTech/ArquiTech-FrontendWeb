import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const results = fileURLToPath(new URL('../', import.meta.url));
const base = join(results, 'agent-runs');
const out = join(results, 'evidence-review');
const staging = join(results, '.evidence-packages');
const cohort = 'autonomous-cohort-20261110';
const pilot = 'autonomous-web-20261110';
const technical = 'web-20261110-0032';
const allow = {
  [cohort]: /^(?:audit\.(?:json|mjs)|browser-mcp\.mjs|cases\.csv|collect\.mjs|execution\.jsonl|hash\.mjs|manifest\.json|metrics\.(?:json|mjs)|outcomes\.csv|pdf-audit\.json|plan(?:-initial)?\.mjs|reverify\.mjs|run(?:-initial)?\.mjs|sha256\.txt|summary\.json|supplementary\.csv|verification-revisions\.json|verify(?:-initial)?\.mjs|verify-pdfs\.py)$/,
  [pilot]: /^(?:completed\.jsonl|controller\.mjs|manifest\.json|network-audit\.json|outcomes\.csv|sha256\.txt|verification\.json|verify\.mjs)$/,
  [technical]: /^(?:collect-results\.mjs|execution\.log|junit\.xml|manifest\.json|network-audit\.json|observations\.jsonl|outcomes\.csv|playwright\.config\.ts|playwright\.json|sha256\.txt|summary\.json)$/
};
const groups = ['web-ab-tecnico-y-piloto', 'web-ab-cohorte-ec01-ec04', 'web-ab-cohorte-ec05-ec09'];
const lists = new Map(groups.map(g => [g, []]));
const rows = [], decisions = [];
const quote = x => '"'+String(x).replaceAll('"','""')+'"';
const hash = data => createHash('sha256').update(data).digest('hex');
const suspect = /(?:sk-(?:proj-|live-)[a-z0-9_-]{12}|gh[pousr]_[a-z0-9]{20}|github_pat_[a-z0-9_]{20}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[A-Z0-9]{16})/i;

for (const run of readdirSync(base, {withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort()) {
  const entries = readdirSync(join(base,run), {recursive:true}).map(x=>x.replaceAll('\\','/')).sort();
  const known = new Map();
  if (entries.includes('sha256.txt')) {
    for (const line of readFileSync(join(base,run,'sha256.txt'),'utf8').trim().split(/\r?\n/)) known.set(line.slice(66),line.slice(0,64));
  }
  for (const name of entries) {
    const path = join(base,run,name);
    const stat = statSync(path);
    if (!stat.isFile()) continue;
    const [folder,file] = name.split('/');
    let location='local', asset='';
    if (allow[run]?.test(name)) location='git';
    if ((run===technical && /^(records|traces)\//.test(name)) ||
        (run===pilot && /^EC\d{2}-[AB]\/(?:[^/]+\.(?:png|zip|pdf)|verification-input\.json)$/.test(name)) ||
        (run===pilot && name==='observations.jsonl')) {
      location='release'; asset=groups[0];
    }
    if (run===cohort && /^(SUP-)?EC\d{2}-/.test(folder) && /^[^/]+\/(?:[^/]+\.(?:png|pdf|zip)|pdf-extracted\.txt|observations\.jsonl|verification-input\.json|result(?:-verified)?\.json)$/.test(name)) {
      location='release'; asset=/EC0[1-4]-/.test(folder)?groups[1]:groups[2];
      if (file==='result.json') {
        const revised=join(base,run,folder,'result-verified.json');
        let verdict;
        try { verdict=JSON.parse(readFileSync(revised,'utf8')); }
        catch(error) { if(error.code!=='ENOENT')throw error; verdict=JSON.parse(readFileSync(path,'utf8')); }
        decisions.push({...verdict, model:verdict.model??'gpt-6.1-sol'});
      }
    }
    const data=readFileSync(path);
    const digest=hash(data);
    if (known.has(name) && known.get(name)!==digest) throw Error('Hash original distinto: '+run+'/'+name);
    if (location!=='local' && /\.(?:json|jsonl|csv|mjs|ts|txt|log|xml|py)$/.test(name) && suspect.test(data.toString('utf8'))) throw Error('Patrón sensible: '+run+'/'+name);
    if (asset) lists.get(asset).push(run+'/'+name);
    rows.push([run+'/'+name,stat.size,digest,location,asset?asset+'.tar.gz':'']);
  }
  if (known.size && rows.filter(row=>row[0].startsWith(run+'/') && known.has(row[0].slice(run.length+1))).length!==known.size) throw Error('Faltan entradas con huella original: '+run);
}
const assignments=decisions.filter(x=>!x.id.startsWith('SUP-'));
const prior=JSON.parse(readFileSync(join(base,pilot,'verification.json'),'utf8'));
const correct=[...assignments,...prior].filter(x=>x.outcome_correct===true).length;
const incorrect=assignments.filter(x=>x.outcome_correct===false).length;
if (assignments.length!==116 || prior.length!==16 || correct!==100 || incorrect!==32 || assignments.some(x=>x.status!=='executed')) throw Error('Los totales no coinciden con las asignaciones verificadas');
writeFileSync(join(out,'verification-cohort.jsonl'),decisions.sort((a,b)=>a.id.localeCompare(b.id)).map(x=>JSON.stringify(x)).join('\n')+'\n');
writeFileSync(join(out,'inventory.csv'),['path,bytes,sha256,storage,asset',...rows.map(row=>row.map(quote).join(','))].join('\n')+'\n');
for (const [name,entries] of lists) writeFileSync(join(staging,name+'.lst'),entries.join('\n')+'\n');
const totals={};
for (const [,bytes,,location,asset] of rows) {
 const key=asset||location;
 totals[key]??={files:0,bytes:0};
 totals[key].files++;totals[key].bytes+=bytes;
}
console.log(JSON.stringify({totals,executed:assignments.length+prior.length,correct,incorrect},null,2));
