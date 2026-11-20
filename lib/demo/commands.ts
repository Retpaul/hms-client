import { base, stamp, today, uid, type Command, type CommandType, type DemoState, type HospitalData, type RoleId, type Row } from './types';
import { seedHospital } from './seed';
import { workEmail } from './organisation';
import { departmentKey } from '../departments';

const permissions: Record<CommandType, RoleId[]> = {
  register:['records','reception','admin'],editPatient:['records','admin'],merge:['records','admin'],proxy:['records','admin','patient'],document:['records','doctor'],
  book:['reception','doctor','admin','patient'],appointment:['reception','doctor','nurse','patient'],telemedicine:['doctor','reception','patient'],triage:['nurse','doctor'],encounter:['doctor'],sign:['doctor'],amend:['doctor'],order:['doctor'],orderProgress:['lab','imaging','doctor'],prescribe:['doctor'],prescription:['pharmacy'],dispense:['pharmacy'],admit:['doctor','nurse','admin'],transfer:['nurse','admin'],wardTask:['nurse'],addWardTask:['nurse','doctor'],dischargeDraft:['doctor'],discharge:['doctor'],stock:['pharmacy','admin'],payment:['cashier','patient'],discount:['cashier','admin'],refund:['cashier','admin'],claim:['claims'],message:['patient','doctor','nurse','reception'],reading:['nurse'],reminder:['reception','admin'],department:['admin'],inviteUser:['admin'],invitationStatus:['admin'],staff:['admin'],updateStaff:['admin'],settings:['admin'],bed:['admin'],procurement:['pharmacy','admin'],support:['platform'],hospital:['platform'],audit:['doctor','nurse','records','reception','pharmacy','lab','imaging','cashier','claims','admin','platform','patient'],aiAudit:['doctor','nurse','records','reception','pharmacy','lab','imaging','cashier','claims','admin','platform','patient'],aiAccept:['doctor','nurse','records','reception','pharmacy','lab','imaging','cashier','claims','admin','patient'],
};
const touch = (row: Row) => { row.version++; };
function find<T extends {id:string}>(rows:T[], id?:string):T { const row = rows.find(r=>r.id===id); if(!row) throw new Error('This record is unavailable in the selected hospital.'); return row; }
function required(v:string|undefined, label:string) { if(!v?.trim()) throw new Error(`${label} is required.`); return v.trim(); }
function amount(v:string|undefined,label:string,allowZero=false) { const n=Number(v); if(!Number.isFinite(n)||n<0||(!allowZero&&n===0)) throw new Error(`Enter a valid ${label}.`); return n; }
function integer(v:string|undefined,label:string) { const n=amount(v,label); if(!Number.isInteger(n)) throw new Error(`${label} must be a whole number.`); return n; }
function audit(d:HospitalData, actor:RoleId, action:string, detail:string) {d.activity.unshift({...base(uid('event'),'recorded'),actor,action,detail});}
function charge(d:HospitalData,patientId:string,sourceId:string,label:string,price:number) {if(!d.invoices.some(i=>i.sourceId===sourceId))d.invoices.push({...base(uid('inv'),'unpaid'),patientId,sourceId,label,amount:price,paid:0,discount:0,discountRequested:0});}
function invoiceStatus(i:HospitalData['invoices'][number]) {i.status=i.paid>=i.amount-i.discount?'paid':i.paid>0?'partial':'unpaid';touch(i);}
export function applyCommand(current:DemoState, hospitalId:string, role:RoleId, command:Command):DemoState {
  if(!permissions[command.type].includes(role)) throw new Error('Your selected demo role cannot perform this action.');
  const next=structuredClone(current), d=next.datasets[hospitalId];
  if(!d) throw new Error('Hospital unavailable.');
  const v=command.values||{}, pid=command.patientId;
  if(pid) {const p=find(d.patients,pid);if(p.mergedInto)throw new Error('Open the surviving patient record.');if(role==='patient'&&pid!==d.portalPatientId)throw new Error('This patient is outside your portal access.');}
  if(pid&&command.id&&command.type!=='merge') {
    const related=[...d.encounters,...d.orders,...d.prescriptions,...d.admissions,...d.tasks,...d.invoices,...d.payments,...d.claims,...d.documents,...d.messages].find(r=>r.id===command.id);
    if(related&&related.patientId!==pid)throw new Error('This record belongs to another patient.');
  }
  switch(command.type) {
    case 'register': {
      const name=required(v.name,'Patient name'), dob=required(v.dob,'Date of birth');
      if(dob>today())throw new Error('Date of birth cannot be in the future.');
      if(d.patients.some(p=>!p.mergedInto&&p.name.toLowerCase()===name.toLowerCase()&&p.dob===dob))throw new Error('A matching patient already exists. Review the existing chart before registering.');
      if(v.consent!=='true')throw new Error('Registration consent is required in this demo.');
      d.patients.push({...base(uid('patient'),'active'),name,dob,sex:v.sex||'Not specified',phone:required(v.phone,'Phone'),address:v.address||'',nextOfKin:v.nextOfKin||'',identifier:`${hospitalId.toUpperCase()}-${String(d.patients.length+1).padStart(5,'0')}`,allergies:v.allergies||'Not recorded',problems:'Not recorded',coverage:v.coverage||'Self-pay',consent:true,caregiver:v.caregiver||'',proxy:false});break;
    }
    case 'editPatient': {const p=find(d.patients,pid);for(const key of ['name','phone','address','nextOfKin','allergies','problems','coverage','caregiver'] as const)if(v[key]!==undefined)p[key]=v[key];touch(p);break;}
    case 'merge': {
      const source=find(d.patients,command.id),target=find(d.patients,pid);if(source.id===target.id||source.mergedInto||target.mergedInto)throw new Error('Select two distinct active patient records.');
      if(v.confirmation!==source.identifier)throw new Error('Enter the source hospital number to confirm the merge.');
      if(target.allergies!==source.allergies)target.allergies=`Reconciliation required — existing: ${target.allergies}; merged source ${source.identifier}: ${source.allergies}`;
      if(target.problems!==source.problems)target.problems=`${target.problems}; merged source ${source.identifier}: ${source.problems}`;
      for(const collection of [d.appointments,d.encounters,d.observations,d.orders,d.prescriptions,d.admissions,d.tasks,d.invoices,d.payments,d.claims,d.documents,d.messages,d.readings])for(const row of collection)if(row.patientId===source.id){row.patientId=target.id;touch(row);}
      if(d.portalPatientId===source.id)d.portalPatientId=target.id;source.mergedInto=target.id;source.status='merged';touch(source);touch(target);break;
    }
    case 'proxy': {const p=find(d.patients,pid);p.proxy=v.enabled==='true';if(v.caregiver)p.caregiver=v.caregiver;touch(p);break;}
    case 'document': d.documents.push({...base(uid('doc'),'draft'),patientId:required(pid,'Patient'),title:required(v.title,'Document title'),content:required(v.content,'Document content'),releasedToPatient:false});break;
    case 'book': {
      const date=required(v.date,'Date'),time=required(v.time,'Time'),clinician=required(v.clinician,'Clinician'),room=required(v.room,'Room');
      if(!d.settings.clinicians.includes(clinician)||!d.settings.rooms.includes(room))throw new Error('Select an available clinician and room.');
      if(date<today())throw new Error('Choose today or a future date.');
      if(d.appointments.some(a=>a.id!==command.id&&a.date===date&&a.time===time&&!['cancelled','completed','no-show'].includes(a.status)&&(a.clinician===clinician||a.room===room)))throw new Error('This clinician or room is already booked. Choose another slot.');
      if(command.id){const a=find(d.appointments,command.id);if(role==='patient'&&a.patientId!==d.portalPatientId)throw new Error('Access denied.');if(!['booked','waiting'].includes(a.status))throw new Error('This appointment can no longer be rescheduled.');Object.assign(a,{date,time,clinician,room});touch(a);}
      else d.appointments.push({...base(uid('apt'),'booked'),patientId:required(pid,'Patient'),date,time,clinician,room,mode:v.mode||'in-person',reason:required(v.reason,'Reason'),reminders:v.reminders==='true'});break;
    }
    case 'appointment': {
      const a=find(d.appointments,command.id);if(role==='patient'&&a.patientId!==d.portalPatientId)throw new Error('Access denied.');
      const transitions:Record<string,string[]>={booked:['waiting','cancelled','no-show'],waiting:['in consultation','cancelled'],'in consultation':['completed']};
      if(role==='patient'&&v.status!=='cancelled')throw new Error('Your care team updates arrival status.');
      if(!transitions[a.status]?.includes(v.status))throw new Error('This appointment transition is unavailable.');a.status=v.status;touch(a);
      if(a.status==='in consultation'&&!d.encounters.some(e=>e.appointmentId===a.id))d.encounters.push({...base(uid('enc'),'draft'),patientId:a.patientId,appointmentId:a.id,complaint:a.reason,diagnosis:'',note:'',amendments:[],referral:'',followUp:''});break;
    }
    case 'triage': {
      const systolic=amount(v.systolic,'systolic pressure'),diastolic=amount(v.diastolic,'diastolic pressure'),pulse=amount(v.pulse,'pulse'),temperature=amount(v.temperature,'temperature'),spo2=amount(v.spo2,'oxygen saturation'),pain=amount(v.pain,'pain score',true);
      if(systolic<40||systolic>300||diastolic<20||diastolic>200||systolic<=diastolic||pulse<20||pulse>250||temperature<30||temperature>45||spo2>100||pain>10)throw new Error('Review the observation values and units.');
      d.observations.unshift({...base(uid('obs'),'recorded'),patientId:required(pid,'Patient'),systolic,diastolic,pulse,temperature,spo2,pain,note:v.note||'',source:v.source||'Triage'});break;
    }
    case 'encounter': {const e=find(d.encounters,command.id);if(e.status==='signed')throw new Error('Signed notes require an amendment.');e.note=required(v.note,'Note');e.diagnosis=v.diagnosis||'';e.referral=v.referral||'';e.followUp=v.followUp||'';touch(e);break;}
    case 'sign': {const e=find(d.encounters,command.id);if(e.status!=='draft'||!e.note||!e.diagnosis)throw new Error('Save a note and diagnosis before signing.');e.status='signed';e.signedAt=stamp();touch(e);charge(d,e.patientId,e.id,'Consultation',d.settings.consultationFee);if(e.appointmentId){const a=find(d.appointments,e.appointmentId);a.status='completed';touch(a);}break;}
    case 'amend': {const e=find(d.encounters,command.id);if(e.status!=='signed')throw new Error('Only signed notes can be amended.');e.amendments.push(`${stamp()} · ${required(v.note,'Amendment')}`);touch(e);break;}
    case 'order': {const e=find(d.encounters,command.id),name=required(v.name,'Investigation');if(d.orders.some(o=>o.encounterId===e.id&&o.name.toLowerCase()===name.toLowerCase()&&o.status!=='cancelled'))throw new Error('This investigation is already requested for this encounter.');d.orders.push({...base(uid('order'),'ordered'),patientId:e.patientId,encounterId:e.id,kind:v.kind==='imaging'?'imaging':'lab',name,specimen:'',result:'',unit:v.unit||'',range:v.range||'',flag:'not assessed',history:[],releasedToPatient:false,criticalAcknowledged:false});break;}
    case 'orderProgress': {
      const o=find(d.orders,command.id);if(role==='doctor'&&(v.status!=='acknowledged'||o.flag!=='critical'))throw new Error('Doctors can acknowledge released critical results here.');if(role!=='doctor'&&((o.kind==='lab'&&role!=='lab')||(o.kind==='imaging'&&role!=='imaging')))throw new Error('This request belongs to another department.');
      const allowed:Record<string,string[]>={ordered:o.kind==='lab'?['collected','cancelled']:['scheduled','cancelled'],collected:['received','rejected'],rejected:['collected'],received:['draft'],scheduled:['performed'],performed:['draft'],draft:['reviewed'],reviewed:['released'],released:['amended','acknowledged'],amended:['reviewed'],acknowledged:['amended']};
      if(!allowed[o.status]?.includes(v.status))throw new Error('Complete the preceding investigation step first.');
      if(v.status==='collected')o.specimen=required(v.specimen,'Specimen identifier');
      if(v.status==='rejected')o.history.push(`Specimen rejected: ${required(v.reason,'Rejection reason')}`);
      if(v.status==='scheduled')o.history.push(`Scheduled ${required(v.slot,'Examination slot')}`);
      if(v.status==='draft'||v.status==='amended'){if(v.status==='amended')o.history.push(`Previous report: ${o.result}`);o.result=required(v.result,'Result/report');o.unit=v.unit||o.unit;o.range=v.range||o.range;o.flag=v.flag||'not assessed';o.releasedToPatient=false;}
      if(v.status==='released'){o.releasedToPatient=true;charge(d,o.patientId,o.id,o.name,o.kind==='lab'?5000:15000);}
      if(v.status==='acknowledged')o.criticalAcknowledged=true;
      o.status=v.status;touch(o);break;
    }
    case 'prescribe': {
      const e=find(d.encounters,command.id),p=find(d.patients,e.patientId),item=find(d.stock,v.itemId);
      if(d.prescriptions.some(r=>r.encounterId===e.id&&r.itemId===item.id&&r.status!=='cancelled'))throw new Error('A prescription for this item already exists in the encounter.');
      if(/penicillin/i.test(p.allergies)&&/amoxicillin/i.test(item.name)&&!v.overrideReason?.trim())throw new Error('Demo allergy rule: penicillin allergy. Choose another medicine or document the prescriber override reason.');
      d.prescriptions.push({...base(uid('rx'),'pending'),patientId:e.patientId,encounterId:e.id,itemId:item.id,instruction:required(v.instruction,'Instructions'),quantity:integer(v.quantity,'quantity'),issued:0,overrideReason:v.overrideReason||'',clarification:''});break;
    }
    case 'prescription': {const r=find(d.prescriptions,command.id);if(['dispensed','cancelled'].includes(r.status))throw new Error('This prescription is closed.');if(!['verified','clarification','cancelled'].includes(v.status))throw new Error('Invalid prescription status.');if(v.status==='clarification')r.clarification=required(v.reason,'Clarification');r.status=v.status;touch(r);break;}
    case 'dispense': {
      const r=find(d.prescriptions,command.id);if(!['verified','partial'].includes(r.status))throw new Error('Verify this prescription before dispensing.');const item=find(d.stock,r.itemId),quantity=integer(v.quantity,'issue quantity');
      if(item.expiry<today())throw new Error('Expired stock cannot be dispensed.');if(quantity>item.quantity||quantity>r.quantity-r.issued)throw new Error('Quantity exceeds stock or the outstanding prescription.');
      item.quantity-=quantity;touch(item);r.issued+=quantity;r.status=r.issued===r.quantity?'dispensed':'partial';touch(r);
      const movementId=uid('issue');d.movements.unshift({...base(movementId,'posted'),itemId:item.id,quantity:-quantity,location:item.location,reason:'Dispensing',sourceId:r.id});charge(d,r.patientId,movementId,`${item.name} × ${quantity}`,item.price*quantity);break;
    }
    case 'admit': {
      if(d.admissions.some(a=>a.patientId===pid&&a.status==='admitted'))throw new Error('This patient already has an active admission.');const b=find(d.beds,v.bedId);if(b.status!=='available')throw new Error('This bed is no longer available.');b.status='occupied';touch(b);d.admissions.push({...base(uid('adm'),'admitted'),patientId:required(pid,'Patient'),bedId:b.id,previousBeds:[],reason:required(v.reason,'Admission reason'),summary:'',reconciled:false,followUp:''});break;
    }
    case 'transfer': {const a=find(d.admissions,command.id),b=find(d.beds,v.bedId);if(a.status!=='admitted'||b.status!=='available')throw new Error('Select an available bed for an active admission.');const old=find(d.beds,a.bedId);old.status='available';touch(old);a.previousBeds.push(`${old.name} → ${b.name} · ${stamp()}`);a.bedId=b.id;touch(a);b.status='occupied';touch(b);break;}
    case 'addWardTask': {const a=find(d.admissions,command.id);if(a.status!=='admitted')throw new Error('Admission is closed.');if(v.kind==='medication'){const r=find(d.prescriptions,v.prescriptionId);if(r.patientId!==a.patientId||!['verified','partial','dispensed'].includes(r.status))throw new Error('Select a verified prescription for this admitted patient.');}d.tasks.push({...base(uid('task'),'due'),patientId:a.patientId,admissionId:a.id,kind:v.kind||'task',title:required(v.title,'Task'),due:v.due||'12:00',outcome:'',reason:'',prescriptionId:v.kind==='medication'?v.prescriptionId:undefined});break;}
    case 'wardTask': {const t=find(d.tasks,command.id);if(t.status!=='due')throw new Error('This task is already recorded.');if(!['administered','refused','omitted','completed','escalated'].includes(v.outcome))throw new Error('Select an outcome.');if(t.kind==='medication'&&v.outcome==='completed')throw new Error('Record the actual medication outcome.');if(t.kind==='medication'&&v.outcome==='administered'){const r=d.prescriptions.find(r=>r.id===t.prescriptionId);if(!r||r.patientId!==t.patientId||!['verified','partial','dispensed'].includes(r.status))throw new Error('A linked verified prescription is required before administration.');}if(v.outcome!=='administered'&&v.outcome!=='completed')required(v.reason,'Reason');t.status='recorded';t.outcome=v.outcome;t.reason=v.reason||'';touch(t);break;}
    case 'dischargeDraft': {const a=find(d.admissions,command.id);if(a.status!=='admitted')throw new Error('Admission is closed.');a.summary=required(v.summary,'Discharge summary');a.reconciled=v.reconciled==='true';a.followUp=v.followUp||'';touch(a);break;}
    case 'discharge': {const a=find(d.admissions,command.id);if(a.status!=='admitted'||!a.summary||!a.reconciled||!a.followUp)throw new Error('Save the summary, reconcile medications and arrange follow-up before discharge.');if(d.tasks.some(t=>t.admissionId===a.id&&t.status==='due'))throw new Error('Resolve or explicitly record outstanding ward tasks before discharge.');a.status='discharged';touch(a);const b=find(d.beds,a.bedId);b.status='available';touch(b);d.documents.push({...base(uid('discharge'),'signed'),patientId:a.patientId,title:'Discharge summary',content:`${a.summary}\nFollow-up: ${a.followUp}`,releasedToPatient:true});break;}
    case 'stock': {
      const item=find(d.stock,command.id),n=amount(v.quantity,'quantity',v.kind==='adjust'),kind=required(v.kind,'Movement type');
      if(!Number.isInteger(n))throw new Error('Stock quantity must be a whole number.');
      const original=item.quantity;
      if(kind==='transfer'){if(!v.location||v.location===item.location)throw new Error('Choose another stock location.');if(n>item.quantity)throw new Error('Insufficient stock.');item.quantity-=n;const target=d.stock.find(s=>s.name===item.name&&s.batch===item.batch&&s.location===v.location);if(target){target.quantity+=n;touch(target);}else d.stock.push({...item,...base(uid('stock'),'available'),location:v.location,quantity:n});}
      else if(kind==='adjust') {required(v.reason,'Adjustment reason');item.quantity=n;}else if(kind==='receive')item.quantity+=n;else throw new Error('Invalid movement type.');
      d.movements.unshift({...base(uid('movement'),'posted'),itemId:item.id,quantity:kind==='transfer'?-n:kind==='adjust'?n-original:n,location:v.location||item.location,reason:`${kind}: ${v.reason||'Demo stock movement'}`,sourceId:item.id});touch(item);break;
    }
    case 'payment': {const i=find(d.invoices,command.id);if(role==='patient'&&i.patientId!==d.portalPatientId)throw new Error('Access denied.');const n=amount(v.amount,'payment amount');if(n>i.amount-i.discount-i.paid)throw new Error('Payment exceeds the outstanding balance.');i.paid+=n;invoiceStatus(i);d.payments.push({...base(uid('receipt'),'paid'),patientId:i.patientId,invoiceId:i.id,amount:n,method:v.method||'Transfer (simulated)',reference:uid('DEMO')});break;}
    case 'discount': {const i=find(d.invoices,command.id);if(role==='cashier'){const n=amount(v.amount,'discount');if(n>i.amount-i.paid)throw new Error('Discount exceeds the unpaid amount.');i.discountRequested=n;}else {if(!i.discountRequested)throw new Error('No pending discount request.');if(i.discountRequested>i.amount-i.paid)throw new Error('The balance changed after this request. Review the discount.');i.discount=i.discountRequested;i.discountRequested=0;invoiceStatus(i);}touch(i);break;}
    case 'refund': {const p=find(d.payments,command.id);if(role==='cashier'){if(p.status!=='paid')throw new Error('A refund is already requested.');p.status='refund requested';}else {if(p.status!=='refund requested')throw new Error('A refund request is required.');p.status='refunded';const i=find(d.invoices,p.invoiceId);i.paid-=p.amount;invoiceStatus(i);}touch(p);break;}
    case 'claim': {
      const c=find(d.claims,command.id);const status=v.status;
      if(status==='authorised'){if(c.status!=='draft')throw new Error('Claim already progressed.');c.authorisation=required(v.authorisation,'Authorisation reference');c.documents=v.documents==='true';}
      else if(status==='prepared'){if(!['authorised','rejected'].includes(c.status)||!c.authorisation||v.documents!=='true')throw new Error('Record authorisation and attach required documents.');c.documents=true;}
      else if(status==='exported'){if(c.status!=='prepared')throw new Error('Prepare the claim first.');}
      else if(status==='submitted'){if(c.status!=='exported')throw new Error('Export the claim first.');c.submissions.push(`${stamp()} · ${c.amount} NGN · ${c.authorisation} · simulated submission`);}
      else if(status==='rejected'){if(c.status!=='submitted')throw new Error('Only submitted claims can be rejected.');c.rejection=required(v.rejection,'Rejection reason');}
      else if(status==='paid'||status==='partial'){if(!['submitted','partial'].includes(c.status))throw new Error('Submit before recording remittance.');const n=amount(v.amount,'remittance');if(n>c.amount-c.paid)throw new Error('Remittance exceeds balance.');c.paid+=n;c.status=c.paid===c.amount?'paid':'partial';touch(c);break;}
      else throw new Error('Invalid claim transition.');c.status=status;touch(c);break;
    }
    case 'message': d.messages.unshift({...base(uid('msg'),'sent'),patientId:required(pid,'Patient'),subject:required(v.subject,'Subject'),body:required(v.body,'Message'),sender:role==='patient'?'Patient':'Care team'});break;
    case 'reading': {const r=find(d.readings,command.id);if(r.status!=='pending')throw new Error('Reading already reviewed.');if(v.status==='accepted'){if(r.duplicateOf||Date.now()-Date.parse(r.capturedAt)>86400000)throw new Error('Duplicate or stale reading: reject or request a new reading.');d.observations.unshift({...base(uid('obs'),'recorded'),patientId:r.patientId,...r.observation});}else if(v.status!=='rejected')throw new Error('Invalid reading decision.');r.status=v.status;touch(r);break;}
    case 'reminder': {const a=find(d.appointments,command.id);if(!d.settings.reminders||!a.reminders)throw new Error('Reminders are disabled for this appointment or hospital.');if(d.messages.some(m=>m.subject===`Reminder ${a.id}`))throw new Error('A reminder is already in the outbox.');d.messages.push({...base(uid('outbox'),'queued'),patientId:a.patientId,subject:`Reminder ${a.id}`,body:v.body||`Appointment ${a.date} ${a.time}, ${a.clinician}.`,sender:'Simulated outbox'});break;}
    case 'department': {
      const name=required(v.name,'Department name');
      if(!departmentKey(name)||d.settings.departments.some(n=>departmentKey(n)===departmentKey(name)))throw new Error('A department with this name already exists or its name is invalid.');
      if(name.length<2||name.length>64||/[\x00-\x1f/\\]/.test(name))throw new Error('Use a department name of 2–64 characters without slashes.');
      if(d.settings.departments.some(n=>n.toLowerCase()===name.toLowerCase()))throw new Error('A department with this name already exists.');
      if((v.description||'').length>1000)throw new Error('Keep the description under 1,000 characters.');
      d.settings.departments.push(name);d.settings.departmentDescriptions={...d.settings.departmentDescriptions,[name]:v.description||''};break;
    }
    case 'inviteUser': {
      const department=required(v.department,'Department'),email=workEmail(required(v.email,'Work email')),name=required(v.name,'Full name');
      if(!d.settings.departments.includes(department))throw new Error('This department is unavailable.');
      const allowedRoles:RoleId[]=['doctor','nurse','records','reception','pharmacy','lab','imaging','cashier','claims','admin'];
      if(!allowedRoles.includes(v.role as RoleId))throw new Error('Select a hospital role for this user.');
      if(d.staff.some(s=>s.email?.toLowerCase()===email)||next.hospitals.find(h=>h.id===hospitalId)?.adminEmail.toLowerCase()===email)throw new Error('This email already belongs to a user in this organisation.');
      const staffId=uid('staff'),role=v.role as RoleId;
      d.staff.push({...base(staffId,'invited'),name,email,role,department,enabled:false});
      d.invitations??=[];d.invitations.push({id:uid('invitation'),staffId,email,role,department,token:uid('invite'),expiresAt:new Date(Date.now()+7*86400000).toISOString(),status:'invited'});break;
    }
    case 'invitationStatus': {
      const invitation=find(d.invitations||[],command.id),user=find(d.staff,invitation.staffId);
      if(invitation.status==='accepted')throw new Error('This user has already joined. Manage their access from the user directory.');
      if(v.status==='revoked'){invitation.status='revoked';user.status='revoked';user.enabled=false;}
      else if(v.status==='resend'){invitation.token=uid('invite');invitation.expiresAt=new Date(Date.now()+7*86400000).toISOString();invitation.status='invited';user.status='invited';}
      else throw new Error('Select a valid invitation action.');touch(user);break;
    }
    case 'updateStaff': {
      const member=find(d.staff,command.id),name=required(v.name,'Full name'),department=required(v.department,'Department'),nextRole=v.role as RoleId;
      if(!['doctor','nurse','records','reception','pharmacy','lab','imaging','cashier','claims','admin'].includes(nextRole))throw new Error('Select a hospital role.');
      if(!d.settings.departments.includes(department))throw new Error('Choose an available department.');
      if(name.length>120)throw new Error('Keep the name under 120 characters.');
      if(member.owner&&(nextRole!=='admin'||department!==member.department))throw new Error('The organisation owner must remain a hospital administrator in their current department.');
      const roleChanged=member.role!==nextRole||member.department!==department;
      member.name=name;member.role=nextRole;member.department=department;touch(member);
      const invitation=d.invitations?.find(i=>i.staffId===member.id&&i.status!=='accepted');
      if(invitation){invitation.role=nextRole;invitation.department=department;if(roleChanged){invitation.token=uid('invite');invitation.expiresAt=new Date(Date.now()+7*86400000).toISOString();}}
      break;
    }
    case 'staff': {if(!command.id)throw new Error('Open a department on the People page to invite a user with their work email and role.');const s=find(d.staff,command.id);if(s.owner)throw new Error('The organisation owner cannot be disabled in this preview.');if(!s.email||s.status==='invited'||s.status==='revoked')throw new Error('Complete the department invitation before enabling this user.');s.enabled=!s.enabled;s.status=s.enabled?'active':'disabled';touch(s);break;}
    case 'settings': {if(v.consultationFee)d.settings.consultationFee=amount(v.consultationFee,'consultation fee');if(v.room&&!d.settings.rooms.includes(v.room))d.settings.rooms.push(v.room);if(v.clinician&&!d.settings.clinicians.includes(v.clinician))d.settings.clinicians.push(v.clinician);if(v.department&&!d.settings.departments.includes(v.department))d.settings.departments.push(v.department);if(v.aiEnabled!==undefined)d.settings.aiEnabled=v.aiEnabled==='true';if(v.reminders!==undefined)d.settings.reminders=v.reminders==='true';break;}
    case 'bed': {if(command.id){const b=find(d.beds,command.id);if(b.status==='occupied')throw new Error('Occupied beds cannot be reconfigured.');if(!['available','reserved','unavailable'].includes(v.status))throw new Error('Invalid bed state.');b.status=v.status;touch(b);}else d.beds.push({...base(uid('bed'),'available'),name:required(v.name,'Bed name'),ward:required(v.ward,'Ward')});break;}
    case 'procurement': d.procurement.push({id:uid('purchase'),title:required(v.title,'Procurement request'),status:'draft'});break;
    case 'support': {if(command.id){const t=find(d.support,command.id);t.status=t.status==='open'?'resolved':'open';}else d.support.push({id:uid('ticket'),title:required(v.title,'Ticket title'),status:'open'});break;}
    case 'hospital': {if(command.id){const h=find(next.hospitals,command.id);if(v.plan)h.plan=v.plan;if(v.status)h.status=v.status;if(v.module){const moduleKey=v.module as typeof h.modules[number];h.modules=h.modules.includes(moduleKey)?h.modules.filter(m=>m!==moduleKey):[...h.modules,moduleKey];}}else {const id=uid('hospital');next.hospitals.push({id,name:required(v.name,'Hospital name'),adminEmail:required(v.email,'Administrator email'),plan:v.plan||'Clinic',status:'active',modules:['overview','patients','appointments','activity','administration']});next.datasets[id]=seedHospital(id);}break;}
    case 'telemedicine': {
      const a=find(d.appointments,command.id);if(!['video','phone'].includes(a.mode))throw new Error('This appointment is not a remote consultation.');if(role==='patient'&&a.patientId!==d.portalPatientId)throw new Error('This appointment is outside your portal access.');
      if(['cancelled','no-show'].includes(a.status))throw new Error('This appointment is closed.');
      const virtual=a.virtual||{stage:'intake',consent:false,identity:false,intake:'',chat:[]};
      if(v.action==='intake'){if(virtual.stage!=='intake')throw new Error('Intake already complete.');virtual.consent=v.consent==='true';virtual.identity=v.identity==='true';virtual.intake=required(v.intake,'Intake answers');if(!virtual.consent||!virtual.identity)throw new Error('Confirm participant identity and consultation consent.');virtual.stage='device check';}
      else if(v.action==='chat'){if(!['connected','phone fallback','disconnected'].includes(virtual.stage))throw new Error('Join the visit before messaging.');virtual.chat.push(`${role}: ${required(v.body,'Message')}`);}
      else {const allowed:Record<string,string[]>={'device check':['waiting'],waiting:['connected'],connected:['disconnected','ended'],disconnected:['connected','phone fallback','reschedule'],'phone fallback':['ended','disconnected'],reschedule:[]};if(!allowed[virtual.stage]?.includes(v.stage))throw new Error('Complete the preceding consultation step first.');if(v.stage==='connected'&&role!=='doctor')throw new Error('The clinician starts or reconnects the consultation.');virtual.stage=v.stage;
        if(v.stage==='connected'){a.status='in consultation';if(!d.encounters.some(e=>e.appointmentId===a.id))d.encounters.push({...base(uid('enc'),'draft'),patientId:a.patientId,appointmentId:a.id,complaint:a.reason,diagnosis:'',note:'',amendments:[],referral:'',followUp:''});}
        if(v.stage==='ended')a.status='completed';if(v.stage==='reschedule'){a.status='booked';}
      }a.virtual=virtual;touch(a);break;
    }
    case 'audit': case 'aiAudit': break;
    case 'aiAccept': {
      const requestId=required(v.requestId,'AI request');if(d.aiReviews.includes(requestId))throw new Error('This response has already been reviewed.');if(Number(v.contextVersion)!==d.version)throw new Error('The record changed. Regenerate this response before applying.');
      const text=required(v.text,'Draft text');
      if(v.target==='encounter'){if(role!=='doctor')throw new Error('Only doctors can apply encounter drafts.');const e=find(d.encounters,command.id);if(e.status==='signed')throw new Error('Signed notes require an amendment.');e.note=text;touch(e);}
      else if(v.target==='order'){if(role!=='imaging')throw new Error('Imaging access is required.');const o=find(d.orders,command.id);if(o.kind!=='imaging'||!['performed','draft'].includes(o.status))throw new Error('Perform the examination before drafting its report. Reviewed reports require a separate amendment.');o.result=text;o.status='draft';touch(o);}
      else if(v.target==='discharge'){if(role!=='doctor')throw new Error('Only doctors can draft a discharge.');const a=find(d.admissions,command.id);if(a.status!=='admitted')throw new Error('Admission closed.');a.summary=text;touch(a);}
      else if(v.target==='procurement'){if(!['pharmacy','admin'].includes(role))throw new Error('Procurement access required.');d.procurement.push({id:uid('purchase'),title:text,status:'draft'});}
      else if(v.target==='document'){if(!['doctor','records','nurse','lab','imaging','claims','admin','reception','patient','pharmacy','cashier'].includes(role))throw new Error('Draft access denied.');d.documents.push({...base(uid('draft'),'draft'),patientId:required(pid,'Patient'),title:`AI draft — ${v.task}`,content:text,releasedToPatient:false});}
      d.aiReviews.push(requestId);break;
    }
  }
  // AI request/reject events do not invalidate the clinical snapshot they describe.
  if(!['audit','aiAudit'].includes(command.type))d.version++;
  audit(d,role,command.type==='audit'?(v.action||'record-read'):command.type,command.type==='audit'?(v.detail||'Synthetic record event'):command.type==='aiAudit'?(v.detail||'Simulated AI event'):command.type==='aiAccept'?`Reviewed ${v.task} · ${v.requestId}`:`${command.id||pid||'Hospital workspace'} ${v.status||''}`);
  return next;
}
