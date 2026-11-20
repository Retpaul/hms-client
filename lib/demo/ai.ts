import type { HospitalData, ModuleId, RoleId } from './types';
export const aiTasks = ['chart-summary','chart-question','ambient-note','dictation','document-extraction','completeness','medication-review','lab-summary','imaging-draft','handover','discharge-draft','telemedicine-preparation','claims-assistance','inventory-planning','operational-insights','patient-explanation'] as const;
export type AiTask = typeof aiTasks[number];
export const aiScenarios = ['success','slow','failure','timeout','insufficient','stale'] as const;
export type AiScenario = typeof aiScenarios[number];
export const aiLabels: Record<AiTask,string> = {'chart-summary':'Summarise chart','chart-question':'Ask the chart','ambient-note':'Draft consultation note',dictation:'Simulate dictation','document-extraction':'Extract document fields',completeness:'Check documentation','medication-review':'Explain medication alerts','lab-summary':'Summarise results','imaging-draft':'Draft imaging report',handover:'Draft nursing handover','discharge-draft':'Draft discharge summary','telemedicine-preparation':'Prepare virtual visit','claims-assistance':'Review claim','inventory-planning':'Suggest reorders','operational-insights':'Explain workload','patient-explanation':'Explain released information'};
export const aiPermissions: Record<AiTask,RoleId[]> = {
  'chart-summary':['doctor','nurse'], 'chart-question':['doctor','nurse'], 'ambient-note':['doctor'],dictation:['doctor'], 'document-extraction':['records','doctor'], completeness:['doctor'], 'medication-review':['doctor','pharmacy'], 'lab-summary':['doctor','lab'], 'imaging-draft':['imaging'],handover:['nurse','doctor'], 'discharge-draft':['doctor'], 'telemedicine-preparation':['doctor'], 'claims-assistance':['claims'], 'inventory-planning':['pharmacy','admin'], 'operational-insights':['admin','reception','platform'], 'patient-explanation':['patient'],
};
export interface AiRecord { id:string; module:ModuleId; label:string; text:string; version:number }
export interface AiContext { subject:{id:string;name:string}; records:AiRecord[] }
export interface AiRequest { requestId:string;task:AiTask;organisationId:string;actorRole:RoleId;patientId?:string;recordId?:string;contextVersion:number;context:AiContext;input:string;scenario:AiScenario }
export interface AiSection { key:string;title:string;text:string }
export interface AiResponse { requestId:string;demo:true;task:AiTask;status:'completed'|'insufficient_data'|'failed';result:{sections:AiSection[]};sourceReferences:AiRecord[];missingInformation:string[];contextVersion:number;fixtureVersion:string;generatedAt:string;error?:{code:string;message:string} }
export const sampleTranscript = (name:string) => `Clinician: Please describe your concern.\n${name}: I am here for follow-up.\nClinician: We will review your recorded history and observations. No new diagnosis or medication instruction has been provided in this sample.`;
export function aiContext(d:HospitalData, patientId?:string, role?:RoleId):AiContext {
  const p=d.patients.find(p=>p.id===patientId),records:AiRecord[]=[];
  const add=(id:string,module:ModuleId,label:string,text:string,version:number)=>records.push({id,module,label,text:text.slice(0,2500),version});
  if(p&&role==='patient') {
    d.documents.filter(x=>x.patientId===p.id&&x.releasedToPatient).forEach(x=>add(x.id,'portal',x.title,x.content,x.version));
    d.orders.filter(x=>x.patientId===p.id&&x.releasedToPatient).forEach(x=>add(x.id,'portal',x.name,`${x.result} ${x.unit}; reference ${x.range}; reported flag ${x.flag}`,x.version));
  } else if(p) {
    add(p.id,'patients','Patient history',`${p.name}. Allergies: ${p.allergies}. Problems: ${p.problems}. Coverage: ${p.coverage}.`,p.version);
    d.encounters.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,'encounters',`Encounter · ${x.status}`,`Complaint: ${x.complaint}. Diagnosis: ${x.diagnosis||'Not recorded'}. Note: ${x.note||'Not recorded'}. Follow-up: ${x.followUp||'Not recorded'}.`,x.version));
    d.observations.filter(x=>x.patientId===p.id).slice(0,8).forEach(x=>add(x.id,'triage','Recorded observations',`BP ${x.systolic}/${x.diastolic} mmHg; pulse ${x.pulse} bpm; temperature ${x.temperature} °C; SpO₂ ${x.spo2}%; pain ${x.pain}/10. ${x.createdAt}. ${x.note}`,x.version));
    d.orders.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,x.kind==='lab'?'laboratory':'imaging',x.name,`${x.status}. ${x.result||'No result recorded'} ${x.unit}; reference ${x.range||'not supplied'}; flag ${x.flag}.`,x.version));
    d.prescriptions.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,'pharmacy','Prescription',`${d.stock.find(s=>s.id===x.itemId)?.name}: ${x.instruction}. ${x.issued}/${x.quantity} issued. ${x.status}. ${x.overrideReason}`,x.version));
    d.admissions.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,'admissions','Admission',`${x.status}. ${x.reason}. Bed ${d.beds.find(b=>b.id===x.bedId)?.name}. Follow-up ${x.followUp||'not recorded'}.`,x.version));
    d.tasks.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,'ward',x.title,`${x.status}; ${x.outcome}; ${x.reason}; due ${x.due}`,x.version));
    d.documents.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,'patients',x.title,x.content,x.version));
    d.claims.filter(x=>x.patientId===p.id).forEach(x=>add(x.id,'claims',x.payer,`${x.status}; authorisation ${x.authorisation||'missing'}; documents ${x.documents?'attached':'missing'}; rejection ${x.rejection||'none'}; amount NGN ${x.amount}`,x.version));
  } else {
    d.stock.forEach(x=>add(x.id,'inventory',x.name,`Stock ${x.quantity}; reorder threshold ${x.threshold}; location ${x.location}; expiry ${x.expiry}`,x.version));
    add('workload','overview','Hospital workload',`${d.appointments.filter(x=>x.status==='waiting').length} waiting; ${d.encounters.filter(x=>x.status==='draft').length} unsigned notes; ${d.beds.filter(x=>x.status==='occupied').length}/${d.beds.length} occupied beds; ${d.orders.filter(x=>!x.releasedToPatient).length} investigations pending.`,d.version);
  }
  const allowed:Partial<Record<RoleId,ModuleId[]>>={pharmacy:['patients','pharmacy','inventory'],lab:['laboratory'],imaging:['imaging'],claims:['claims','encounters'],records:['patients']};
  const scoped=role&&allowed[role]?records.filter(r=>allowed[role]!.includes(r.module)):records;
  return {subject:{id:p?.id||'hospital',name:p?.name||'Hospital operations'},records:scoped.slice(0,70)};
}
export function fixture(request:AiRequest):AiResponse {
  const {task,context,input}=request, all=context.records;
  const filter=(modules:ModuleId[])=>all.filter(r=>modules.includes(r.module));
  let sources:AiRecord[]=all, missing:string[]=[];
  const sections:AiSection[]=[];
  const section=(title:string,text:string)=>sections.push({key:`section-${sections.length}`,title,text});
  const lines=(records:AiRecord[])=>records.map(r=>`${r.label}: ${r.text}`).join('\n')||'No supporting record supplied.';
  switch(task){
    case 'chart-summary': sources=all.filter(r=>r.module!=='claims');section('Chart overview',`${context.subject.name}\n${lines(sources)}`);missing=['Verify current symptoms and reconcile historical information.'];break;
    case 'chart-question': {const term=/allerg|penicillin/i.test(input)?'Patient history':/medicat|prescri/i.test(input)?'Prescription':/result|test|lab/i.test(input)?'':/history|visit|summary/i.test(input)?'Encounter':undefined;if(term===undefined)missing=['This fixture supports questions about allergies, medications, results and visit history.'];else{sources=term?all.filter(r=>r.label.includes(term)):filter(['laboratory','imaging']);if(sources.length)section('Answer from supplied records',lines(sources));else missing=['No matching chart information is recorded.'];}break;}
    case 'ambient-note': case 'dictation': sources=filter(['patients','triage','encounters']);if(input.trim()){section(task==='dictation'?'Simulated transcript':'Subjective',input);section('Objective',lines(filter(['triage'])));section('Assessment and plan','Not supplied in the transcript. Clinician to complete assessment, diagnosis and plan.');}missing=['Clinical assessment and treatment plan require clinician entry.'];break;
    case 'document-extraction': sources=all.filter(r=>r.module==='patients'&&r.label!=='Patient history');sources.forEach(r=>section(r.label,r.text));missing=['Verify each extracted field against the synthetic original.'];break;
    case 'completeness': sources=filter(['encounters']);section('Documentation review',lines(sources));missing=['Check diagnosis, assessment, plan, referral and follow-up before signing.'];break;
    case 'medication-review': sources=filter(['patients','pharmacy']);section('Recorded medication context',lines(sources));section('Review requirement','Check the explicit demo allergy and duplicate-prescription alerts in the prescription composer. This explanation creates no medication order.');break;
    case 'lab-summary': sources=filter(['laboratory']);section('Results as recorded',lines(sources));missing=sources.some(r=>r.text.includes('No result'))?['One or more investigations have no recorded result.']:[];break;
    case 'imaging-draft': sources=filter(['imaging']);if(input.trim()){section('Findings',input);section('Impression','Reporting clinician to complete and verify against the supplied findings.');}else missing=['Enter synthetic findings to draft a report.'];break;
    case 'handover': sources=filter(['admissions','ward','triage','pharmacy']);section('Situation and background',`${context.subject.name}\n${lines(sources)}`);section('Outstanding actions','Review tasks marked due and verify the current medication administration record.');break;
    case 'discharge-draft': sources=filter(['admissions','encounters','pharmacy','laboratory','imaging']);section('Episode summary',`${context.subject.name}\n${lines(sources)}`);section('Discharge checklist','Clinician to reconcile medications, review pending investigations and confirm follow-up.');missing=['Final discharge instructions and follow-up confirmation.'];break;
    case 'telemedicine-preparation': sources=filter(['patients','encounters','triage']);section('Pre-visit context',lines(sources));section('Intake',input||'No intake answers supplied.');missing=['Confirm participant identity, consent and suitability for remote care.'];break;
    case 'claims-assistance': sources=filter(['claims','encounters']);section('Claim review',lines(sources));section('Suggested administrative action','Confirm authorisation, required attachments and payer-specific format. Draft response: Please review the attached corrected documentation.');break;
    case 'inventory-planning': sources=filter(['inventory']);section('Stock review',lines(sources));section('Procurement draft','Review items below their recorded reorder threshold. Confirm demand, expiry and supplier terms before ordering. Illustrative planning only.');break;
    case 'operational-insights': sources=filter(['overview']);section('Current workload',lines(sources));section('Operational review','Review waiting patients, unsigned notes and outstanding investigations with the responsible teams. This fixture does not predict clinical risk.');break;
    case 'patient-explanation': sources=filter(['portal']);section('Your released information',lines(sources));section('Next step','These are the records released by your care team. Contact the team about unfamiliar terms or new symptoms; this demo does not recommend treatment.');break;
  }
  const missingAdmission=['handover','discharge-draft'].includes(task)&&!filter(['admissions']).some(r=>r.text.startsWith('admitted.'));
  if(missingAdmission)missing.push('An active inpatient admission is required for this draft.');
  const insufficient=request.scenario==='insufficient'||!sources.length||!sections.length||missingAdmission;
  if(request.scenario==='insufficient')missing=['The selected demo scenario has insufficient information.'];
  return {requestId:request.requestId,demo:true,task,status:insufficient?'insufficient_data':'completed',result:{sections:insufficient?[]:sections},sourceReferences:sources,missingInformation:missing,contextVersion:request.contextVersion,fixtureVersion:'hms-fixtures-1.0',generatedAt:new Date().toISOString()};
}
export async function callDemoAi(request:AiRequest,signal:AbortSignal):Promise<AiResponse> {
  const response=await fetch('/api/demo/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:request.requestId,task:request.task,actorRole:request.actorRole,organisationId:request.organisationId,patientId:request.patientId,recordId:request.recordId,contextVersion:request.contextVersion,input:request.input,scenario:request.scenario}),signal,cache:'no-store',credentials:'same-origin'});
  const body=await response.json();if(!response.ok)throw new Error(body.error?.message||'The simulated AI service is unavailable.');return body as AiResponse;
}
