import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './plan.mjs';
import {verify} from './verify.mjs';
const changed=[];
for (const id of readdirSync(root).filter(id=>/^(SUP-)?EC\d{2}-/.test(id))) {
 const dir=join(root,id);
 if(!existsSync(join(dir,'result.json')))continue;
 const original=JSON.parse(readFileSync(join(dir,'result.json'),'utf8'));
 const evidence=JSON.parse(readFileSync(join(dir,'verification-input.json'),'utf8'));
 const verdict=verify(evidence);
 if(verdict.outcome_correct===original.outcome_correct&&JSON.stringify(verdict.verified_cases)===JSON.stringify(original.verified_cases))continue;
 const record={...original,...verdict,verification_revision:'Accept a printed percentage such as 62% as semantically equivalent to numeric 62.'};
 writeFileSync(join(dir,'result-verified.json'),JSON.stringify(record,null,2)+'\n');
 changed.push({id,original:original.outcome_correct,revised:record.outcome_correct});
}
writeFileSync(join(root,'verification-revisions.json'),JSON.stringify(changed,null,2)+'\n');
console.log(JSON.stringify(changed));
