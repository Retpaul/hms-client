import { base, modules, stamp, uid, type DemoState, type HospitalData, type RoleId } from './types';
import { seedHospital } from './seed';

export const starterDepartments = ['Administration','General medicine','Nursing','Pharmacy','Laboratory','Imaging','Medical records','Reception','Finance'];
const consumerDomains = new Set(['gmail.com','googlemail.com','yahoo.com','yahoo.co.uk','ymail.com','outlook.com','hotmail.com','live.com','icloud.com','aol.com','proton.me','protonmail.com']);
export function workEmail(value:string):string {
  const email=value.trim().toLowerCase();
  if(email.length>254||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email))throw new Error('Enter a valid official work email address.');
  if(consumerDomains.has(email.split('@')[1]))throw new Error('Use your organisation’s official work email, such as you@yourhospital.org.');
  return email;
}
export interface EmailVerification { email:string;token:string;expiresAt:string;verified:boolean;kind:'new'|'existing' }
export interface OrganisationSession { email:string;organisationId:string;staffId:string;role:RoleId }
export interface OrganisationProfile { name:string;adminName:string;type:string;phone:string;address:string;city:string;state:string;country:string;website:string }
export function accountForEmail(demo:DemoState,email:string):OrganisationSession|undefined {
  for(const hospital of demo.hospitals){
    const user=demo.datasets[hospital.id]?.staff.find(s=>s.email?.toLowerCase()===email&&s.enabled&&s.status==='active');
    if(user)return {email,organisationId:hospital.id,staffId:user.id,role:user.role};
    // Seeded administrator accounts can also enter the demonstration through email.
    if(hospital.adminEmail.toLowerCase()===email&&!hospital.ownerUserId)return {email,organisationId:hospital.id,staffId:'seed-admin',role:'admin'};
  }
}
export function beginVerification(demo:DemoState,value:string):EmailVerification {
  const email=workEmail(value),account=accountForEmail(demo,email);
  const pending=Object.values(demo.datasets).flatMap(d=>d.invitations||[]).find(i=>i.email===email&&i.status==='invited');
  if(pending)throw new Error('Your department invitation is waiting. Open the invitation link from your hospital administrator to join with your assigned role.');
  if(!account&&demo.hospitals.some(h=>(h.emailDomain||h.adminEmail.split('@')[1])===email.split('@')[1]))throw new Error('Your organisation already has a workspace. Ask its hospital administrator to invite you to a department.');
  return {email,token:uid('verify'),expiresAt:new Date(Date.now()+15*60*1000).toISOString(),verified:false,kind:account?'existing':'new'};
}
export function verifyEmail(pending:EmailVerification|undefined,token:string):EmailVerification {
  if(!pending||!token||pending.token!==token)throw new Error('This verification link is invalid. Request a new email.');
  if(Date.parse(pending.expiresAt)<=Date.now())throw new Error('This verification link has expired. Request a new email.');
  return {...pending,verified:true};
}
export function emptyOrganisation(id:string):HospitalData {
  const d=seedHospital(id);
  d.patients=[];d.portalPatientId='';d.appointments=[];d.encounters=[];d.observations=[];d.orders=[];d.prescriptions=[];d.stock=[];d.movements=[];d.admissions=[];d.beds=[];d.tasks=[];d.invoices=[];d.payments=[];d.claims=[];d.documents=[];d.messages=[];d.readings=[];d.staff=[];d.activity=[];d.aiReviews=[];d.procurement=[];d.support=[];d.invitations=[];
  d.settings.departments=[...starterDepartments];d.settings.departmentDescriptions={};
  return d;
}
export function createOrganisation(current:DemoState,pending:EmailVerification|undefined,profile:OrganisationProfile):{demo:DemoState;session:OrganisationSession} {
  if(!pending?.verified||pending.kind!=='new')throw new Error('Verify your official work email before setting up an organisation.');
  verifyEmail(pending,pending.token);
  if(current.hospitals.some(h=>h.adminEmail.toLowerCase()===pending.email||(h.emailDomain||h.adminEmail.split('@')[1])===pending.email.split('@')[1]))throw new Error('This organisation already has an administrator. Sign in or request an invitation.');
  for(const field of ['name','adminName','type','phone','address','city','state','country'] as const)if(!profile[field]?.trim())throw new Error('Complete all required organisation and administrator details.');
  if(profile.website&&!/^https?:\/\//i.test(profile.website))throw new Error('Website must start with https:// or http://.');
  const demo=structuredClone(current),id=uid('org'),ownerId=uid('staff'),data=emptyOrganisation(id);
  data.staff.push({...base(ownerId,'active'),name:profile.adminName.trim(),email:pending.email,role:'admin',department:'Administration',enabled:true,owner:true});
  data.activity.push({...base(uid('event'),'recorded'),actor:'admin',action:'organisation-created',detail:`${profile.adminName.trim()} became the first hospital administrator.`});
  demo.hospitals.push({id,name:profile.name.trim(),plan:'Professional',status:'active',modules:[...modules],adminEmail:pending.email,emailDomain:pending.email.split('@')[1],ownerUserId:ownerId,profile:{...profile},createdAt:stamp()});demo.datasets[id]=data;
  return {demo,session:{email:pending.email,organisationId:id,staffId:ownerId,role:'admin'}};
}
export function acceptDepartmentInvitation(current:DemoState,token:string):{demo:DemoState;session:OrganisationSession} {
  const demo=structuredClone(current);
  for(const hospital of demo.hospitals){const d=demo.datasets[hospital.id],invitation=d.invitations?.find(i=>i.token===token);
    if(!invitation)continue;
    if(invitation.status!=='invited')throw new Error('This invitation has already been used or revoked. Sign in or contact your administrator.');
    if(Date.parse(invitation.expiresAt)<=Date.now())throw new Error('This invitation has expired. Ask your administrator to resend it.');
    if(hospital.status!=='active')throw new Error('This organisation is currently unavailable.');
    const user=d.staff.find(s=>s.id===invitation.staffId);if(!user)throw new Error('The invited user is unavailable.');
    user.enabled=true;user.status='active';user.version++;invitation.status='accepted';d.version++;
    d.activity.unshift({...base(uid('event'),'recorded'),actor:user.role,action:'invitation-accepted',detail:`${user.name} joined ${user.department} as ${user.role}.`});
    return {demo,session:{email:invitation.email,organisationId:hospital.id,staffId:user.id,role:user.role}};
  }
  throw new Error('This invitation link is invalid or has been replaced.');
}
