import { createInterface } from 'node:readline';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const [folder] = process.argv.slice(2);
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
const tools = [
 {name:'observe',description:'Observe the visible browser UI for this task.',inputSchema:{type:'object',properties:{}}},
 {name:'interact',description:'Perform browser actions only on controls identified in the visible observation. Use exact visible role/name, or field index shown by observe. For repeated forms you may batch actions on known controls; each action is logged and the batch stops on an error.',inputSchema:{
   type:'object',required:['actions'],properties:{actions:{type:'array',minItems:1,maxItems:20,items:{
     type:'object',required:['op','reason'],properties:{op:{enum:['click','fill','select','check','reload']},role:{type:'string'},name:{type:'string'},index:{type:'integer',minimum:0},field:{type:'integer',minimum:0},value:{type:'string'},reason:{type:'string'}}
   }}}}},
 {name:'submit',description:'Record the answer for the current objective or case. For a multi-case task this opens the next equivalent case until all cases have been answered. Use blocked with the exact reason if unable to finish.',inputSchema:{
   type:'object',required:['answer'],properties:{answer:{type:'object',additionalProperties:true},blocked:{type:'string'}}}},
 {name:'wait_period',description:'Wait for the end of the current observation period in the incident exercise. Returns the visible state. If applicable, refresh or navigate using the observed interface.',inputSchema:{type:'object',properties:{}}}
];
const send = message => process.stdout.write(JSON.stringify(message)+'\n');
async function request(method,args) {
 const token = randomUUID();
 const input = join(folder,token+'.request');
 const output = join(folder,token+'.response');
 await writeFile(input+'.tmp',JSON.stringify({method,args}));
 await rename(input+'.tmp',input);
 for (let n=0;n<900;n++) {
   try { return JSON.parse(await readFile(output,'utf8')); }
   catch(error) { if(error.code!=='ENOENT') throw error; }
   await wait(150);
 }
 throw Error('Browser controller did not respond before the deadline');
}
for await (const line of createInterface({input:process.stdin,crlfDelay:Infinity})) {
 let msg;
 try { msg=JSON.parse(line); } catch { continue; }
 if(msg.id===undefined) continue;
 try {
   let result;
   if(msg.method==='initialize') result={protocolVersion:msg.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'arquitech-test-browser',version:'1.0.0'}};
   else if(msg.method==='tools/list') result={tools};
   else if(msg.method==='ping') result={};
   else if(msg.method==='tools/call') {
     const out=await request(msg.params.name,msg.params.arguments??{});
     result={content:[{type:'text',text:JSON.stringify(out)}]};
   } else { send({jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Method not found'}});continue; }
   send({jsonrpc:'2.0',id:msg.id,result});
 } catch(error) { send({jsonrpc:'2.0',id:msg.id,error:{code:-32000,message:String(error)}}); }
}
