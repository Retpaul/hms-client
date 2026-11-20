import { aiContext, aiPermissions, aiScenarios, aiTasks, fixture, type AiRequest, type AiScenario, type AiTask } from '@/lib/demo/ai';
import { AccessError, rememberAiResult, workspace } from '@/lib/server/access';
import { failure, identity, input, json, text } from '@/lib/server/http';
export async function POST(request:Request){try{
  const user=await identity(),body=await input(request),task=text(body.task,80) as AiTask;
  if(!aiTasks.includes(task))throw new AccessError(400,'Unknown assistance task.');
  if(!aiPermissions[task].includes(user.role))throw new AccessError(403,'Your role does not have access to this assistance task.');
  if(body.actorRole!==undefined&&body.actorRole!==user.role||body.organisationId!==undefined&&body.organisationId!==user.organisationId)throw new AccessError(403,'Identity and organisation do not match your session.');
  const scenario=(body.scenario||'success') as AiScenario;if(!aiScenarios.includes(scenario))throw new AccessError(400,'Invalid response scenario.');if(scenario!=='success'&&process.env.HMS_AI_TEST_SCENARIOS!=='true')throw new AccessError(403,'Test scenarios are not enabled.');
  const snapshot=workspace(user),data=snapshot.demo.datasets[user.organisationId],patientId=body.patientId===undefined?undefined:text(body.patientId,120);
  if(user.role==='patient'&&patientId!==user.patientId)throw new AccessError(403,'Patient access denied.');
  if(patientId&&!data.patients.some(p=>p.id===patientId))throw new AccessError(404,'Patient unavailable.');
  if(body.contextVersion!==data.version)throw new AccessError(409,'The record changed. Refresh and regenerate the draft.');
  const payload:AiRequest={requestId:text(body.requestId,100),task,actorRole:user.role,organisationId:user.organisationId,patientId,recordId:typeof body.recordId==='string'?body.recordId:undefined,contextVersion:data.version,context:aiContext(data,patientId,user.role),input:text(body.input,8000),scenario};
  if(scenario==='failure')throw new AccessError(503,'The assistance service is unavailable. Try again.');
  await new Promise(resolve=>setTimeout(resolve,scenario==='slow'?6000:scenario==='timeout'?3500:1000));if(scenario==='timeout')throw new AccessError(504,'The request timed out.');
  const result=fixture(payload);if(scenario==='stale')result.contextVersion=Math.max(0,result.contextVersion-1);if(result.status==='completed')rememberAiResult(user,payload.requestId,task,patientId,payload.recordId,result.contextVersion);return json(result);
}catch(e){return failure(e);}}
