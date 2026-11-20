const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {aiTasks,aiPermissions,aiContext}=require('../lib/demo/ai.ts');
const {createDemo}=require('../lib/demo/seed.ts');
const base=process.env.HMS_PREVIEW_URL||'http://localhost:3100';
const data=createDemo().datasets.central;
const request=(overrides={})=>({requestId:'api-test',task:'chart-summary',organisationId:'central',actorRole:'doctor',contextVersion:data.version,context:aiContext(data,'cen-p1','doctor'),input:'What allergies are recorded?',scenario:'success',...overrides});
const send=(body)=>fetch(`${base}/api/demo/ai`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function verify(){
  const results=await Promise.all(aiTasks.map(async task=>{const role=aiPermissions[task][0],operational=['inventory-planning','operational-insights'].includes(task);const response=await send(request({task,actorRole:role,context:aiContext(data,operational?undefined:task==='imaging-draft'?'cen-p2':['handover','discharge-draft'].includes(task)?'cen-p3':'cen-p1',role),input:task==='chart-question'?'What allergies are recorded?':'Synthetic consultation findings supplied for this fixture.'}));assert.equal(response.status,200,task);assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.json();assert.equal(body.demo,true);assert.equal(body.task,task);assert.equal(body.status,'completed',task);assert.ok(body.result.sections.length);assert.ok(body.sourceReferences.length);return task;}));
  assert.equal((await send({})).status,400);
  assert.equal((await send(request({scenario:'unknown'}))).status,400);
  assert.equal((await send(request({task:'inventory-planning',actorRole:'patient'}))).status,403);
  assert.equal((await send(request({context:{subject:{id:'p',name:'x'},records:[{id:'x',module:'patients',label:'x',text:5,version:1}]}}))).status,400);
  assert.equal((await send({oversized:'x'.repeat(140000)})).status,413);
  assert.equal((await fetch(`${base}/api/demo/ai`,{method:'POST',headers:{'Content-Type':'text/plain'},body:'test'})).status,415);
  assert.equal((await send(request({scenario:'failure'}))).status,503);
  assert.equal((await send(request({scenario:'timeout'}))).status,504);
  assert.equal((await (await send(request({scenario:'insufficient'}))).json()).status,'insufficient_data');
  assert.equal((await (await send(request({task:'chart-question',input:'Predict next year'}))).json()).status,'insufficient_data');
  assert.equal((await (await send(request({scenario:'stale'}))).json()).contextVersion,0);
  console.log(`PASS: ${results.length} contextual mock AI tasks, source references, no-store responses, task/role/payload validation and failure scenarios.`);
}
verify().catch(e=>{console.error(e);process.exitCode=1;});
