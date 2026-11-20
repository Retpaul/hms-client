import 'server-only';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createDemo } from '@/lib/demo/seed';
import { applyCommand } from '@/lib/demo/commands';
import { acceptDepartmentInvitation, createOrganisation, emptyOrganisation, workEmail, type EmailVerification, type OrganisationProfile } from '@/lib/demo/organisation';
import { access, base, roleIds, type Command, type CommandType, type DemoState, type Hospital,  type ModuleId, type RoleId } from '@/lib/demo/types';

export interface Preferences { timezone:string; emailNotifications:boolean; compactTables:boolean }
export interface Identity { id:string;name:string;email:string;role:RoleId;organisationId:string;department:string;patientId?:string;preferences:Preferences }
interface Account extends Identity { passwordHash:string;passwordChangedAt?:number }
interface Session { accountId:string;expires:number;lastSeen:number;id?:string;created?:number;browser?:string }
interface Registration { email:string;linkHash:string;expires:number;verified:boolean;previewLink:string }
interface AiReview { accountId:string;task:string;patientId?:string;recordId?:string;version:number;expires:number }
interface Store { demo:DemoState;accounts:Map<string,Account>;sessions:Map<string,Session>;registrations:Map<string,Registration>;attempts:Map<string,{count:number;until:number}>;aiRequests:Map<string,AiReview> }
const globalStore=globalThis as typeof globalThis & { __hmsAccessV2?:Store };
export const sessionCookie='hms_session';
export const registrationCookie='hms_registration';
export const fixturesEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.HMS_FIXTURE_AUTH!=='disabled';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
function passwordMatches(password:string,encoded:string){const [salt,digest]=encoded.split(':');const actual=scryptSync(password,salt,64);return timingSafeEqual(actual,Buffer.from(digest,'hex'));}
const fallbackPasswordHash=passwordHash('unavailable-account-password');
const defaults=():Preferences=>({timezone:'Africa/Lagos',emailNotifications:true,compactTables:false});
function initialise():Store {
  const demo=createDemo(),accounts=new Map<string,Account>();
  demo.datasets.central.staff=[];demo.datasets.harbour.staff=[];
  for(const org of demo.hospitals){org.adminEmail=`admin@${org.id}.hms.test`;org.emailDomain=`${org.id}.hms.test`;}
  for(const role of roleIds){
    const id=`account-${role}`,email=`${role}@central.hms.test`,name=role==='patient'?'Amara Okafor':`${role[0].toUpperCase()+role.slice(1)} User`,department=role==='admin'?'Administration':role==='pharmacy'?'Pharmacy':role==='lab'?'Laboratory':role==='imaging'?'Imaging':role==='nurse'?'Nursing':role==='records'?'Medical records':role==='reception'?'Reception':['cashier','claims'].includes(role)?'Finance':'General medicine';
    accounts.set(id,{id,name,email,role,organisationId:'central',department,patientId:role==='patient'?'cen-p1':undefined,passwordHash:passwordHash('HmsAccess!2026'),preferences:defaults()});
    if(!['patient','platform'].includes(role))demo.datasets.central.staff.push({...base(id,'active'),name,email,role,department,enabled:true,owner:role==='admin'});
  }
  demo.hospitals[0].ownerUserId='account-admin';demo.datasets.central.settings.departments=[...new Set([...demo.datasets.central.settings.departments,...Array.from(accounts.values()).filter(a=>!['patient','platform'].includes(a.role)).map(a=>a.department)])];
  accounts.set('account-harbour',{id:'account-harbour',name:'Harbour Administrator',email:'admin@harbour.hms.test',role:'admin',organisationId:'harbour',department:'Administration',passwordHash:passwordHash('HmsAccess!2026'),preferences:defaults()});
  demo.datasets.harbour.staff.push({...base('account-harbour','active'),name:'Harbour Administrator',email:'admin@harbour.hms.test',role:'admin',department:'Administration',enabled:true,owner:true});demo.hospitals[1].ownerUserId='account-harbour';
  return {demo,accounts,sessions:new Map(),registrations:new Map(),attempts:new Map(),aiRequests:new Map()};
}
export function store(){if(!fixturesEnabled())throw new AccessError(503,'Authentication is not configured for this deployment.');return globalStore.__hmsAccessV2??=initialise();}
export class AccessError extends Error {constructor(public status:number,message:string){super(message);}}
export function publicIdentity(a:Identity):Identity {return {id:a.id,name:a.name,email:a.email,role:a.role,organisationId:a.organisationId,department:a.department,patientId:a.patientId,preferences:a.preferences};}
export function home(a:Identity){return `/dashboard/${a.role}${a.role==='admin'?'/people':''}`;}
export function login(email:string,password:string,previousToken?:string,userAgent=''){
  const s=store(),normal=email.trim().toLowerCase(),attempt=s.attempts.get(normal),now=Date.now();
  if(attempt&&attempt.until>now&&attempt.count>=8)throw new AccessError(429,'Too many sign-in attempts. Try again later.');
  const account=Array.from(s.accounts.values()).find(a=>a.email===normal),valid=passwordMatches(password,account?.passwordHash||fallbackPasswordHash);
  if(!account||!valid||!accountEnabled(account)){s.attempts.set(normal,{count:attempt&&attempt.until>now?attempt.count+1:1,until:now+15*60000});throw new AccessError(401,'Invalid email or password.');}
  s.attempts.delete(normal);if(previousToken)s.sessions.delete(hash(previousToken));return issueSession(account,userAgent);
}
function accountEnabled(a:Identity){if(a.role==='platform')return true;const d=store().demo.datasets[a.organisationId];return store().demo.hospitals.some(h=>h.id===a.organisationId&&h.status==='active')&&(a.role==='patient'||d.staff.some(s=>s.id===a.id&&s.enabled&&s.status==='active'&&s.role===a.role));}
function browserLabel(agent:string){const browser=/Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome-compatible browser':/Safari\//.test(agent)?'Safari':'Web browser';const device=/Windows/.test(agent)?'Windows':/Android/.test(agent)?'Android':/iPhone|iPad/.test(agent)?'iOS':/Macintosh/.test(agent)?'macOS':/Linux/.test(agent)?'Linux':'';return device?`${browser} on ${device}`:browser;}
export function issueSession(account:Account,userAgent=''){const s=store(),raw=token(),now=Date.now();s.sessions.set(hash(raw),{accountId:account.id,expires:now+8*3600000,lastSeen:now,id:token(),created:now,browser:browserLabel(userAgent)});return {token:raw,user:publicIdentity(account),redirectTo:home(account)};}
export function session(raw:string|undefined):Identity|null {
  if(!raw||!fixturesEnabled())return null;const s=store(),key=hash(raw),entry=s.sessions.get(key),now=Date.now();
  if(!entry||entry.expires<=now||entry.lastSeen+30*60000<=now){s.sessions.delete(key);return null;}
  const account=s.accounts.get(entry.accountId);if(!account||!accountEnabled(account)){s.sessions.delete(key);return null;}entry.lastSeen=now;return publicIdentity(account);
}
export function logout(raw:string|undefined){if(raw&&fixturesEnabled())store().sessions.delete(hash(raw));}
export function accountSecurity(user:Identity,raw:string|undefined){
  const s=store(),now=Date.now(),currentKey=raw?hash(raw):'';
  const sessions=[];
  for(const [key,entry] of s.sessions){
    if(entry.expires<=now||entry.lastSeen+30*60000<=now){s.sessions.delete(key);continue;}
    if(entry.accountId!==user.id)continue;
    entry.id??=token();entry.created??=entry.lastSeen;entry.browser??='Web browser';
    sessions.push({id:entry.id,browser:entry.browser,createdAt:new Date(entry.created).toISOString(),lastActiveAt:new Date(entry.lastSeen).toISOString(),expiresAt:new Date(entry.expires).toISOString(),current:key===currentKey});
  }
  return {sessions:sessions.sort((a,b)=>Number(b.current)-Number(a.current)),passwordChangedAt:s.accounts.get(user.id)?.passwordChangedAt?new Date(s.accounts.get(user.id)!.passwordChangedAt!).toISOString():null};
}
export function revokeSessions(user:Identity,raw:string|undefined,action:'others'|'all'|'one',id?:string){
  const s=store(),currentKey=raw?hash(raw):'';let revoked=0;
  for(const [key,entry] of s.sessions){if(entry.accountId!==user.id)continue;if(action==='one'&&entry.id!==id)continue;if(action==='others'&&key===currentKey)continue;if(action==='one'&&key===currentKey)throw new AccessError(400,'Use Sign out to end the current session.');s.sessions.delete(key);revoked++;}
  if(action==='one'&&!revoked)throw new AccessError(404,'Session unavailable.');
  store().demo.datasets[user.organisationId].activity.unshift({...base(token(),'recorded'),actor:user.role,action:'sessions-revoked',detail:`${user.id} revoked ${revoked} session(s).`});
  return {revoked};
}
export function changePassword(user:Identity,raw:string|undefined,currentPassword:string,newPassword:string,userAgent=''){
  const account=store().accounts.get(user.id)!;validatePassword(newPassword);
  if(!passwordMatches(currentPassword,account.passwordHash))throw new AccessError(400,'Current password is incorrect.');
  if(passwordMatches(newPassword,account.passwordHash))throw new AccessError(400,'Choose a password different from your current password.');
  account.passwordHash=passwordHash(newPassword);account.passwordChangedAt=Date.now();revokeSessions(user,raw,'all');
  store().demo.datasets[user.organisationId].activity.unshift({...base(token(),'recorded'),actor:user.role,action:'password-changed',detail:`${user.id} changed their password.`});
  return issueSession(account,userAgent);
}
export function allowed(user:Identity,moduleId:ModuleId){return access[user.role].includes(moduleId)&&(user.role==='platform'||['settings','people','organisation'].includes(moduleId)||store().demo.hospitals.find(h=>h.id===user.organisationId)?.modules.includes(moduleId));}

// Return only the signed-in organisation and records needed by this role.
export function workspace(user:Identity){
  const s=store(),source=s.demo.datasets[user.organisationId],data=emptyOrganisation(user.organisationId),hospital=s.demo.hospitals.find(h=>h.id===user.organisationId)!;
  data.version=source.version;data.portalPatientId=user.patientId||'';data.settings={rooms:[],clinicians:[],departments:[],consultationFee:0,aiEnabled:source.settings.aiEnabled,reminders:source.settings.reminders};
  const clinical=['doctor','nurse'].includes(user.role),registry=['records','reception'].includes(user.role),finance=['cashier','claims'].includes(user.role),admin=user.role==='admin';
  if(clinical||registry||finance||admin||['pharmacy','lab','imaging','patient'].includes(user.role)){
    const relevant=source.patients.filter(p=>user.role!=='patient'||p.id===user.patientId);
    data.patients=relevant.map(p=>({...p,address:clinical||registry||admin||user.role==='patient'?p.address:'',nextOfKin:clinical||registry||user.role==='patient'?p.nextOfKin:'',phone:registry||admin||user.role==='patient'?p.phone:'',allergies:clinical||registry||['pharmacy','patient'].includes(user.role)?p.allergies:'Restricted',problems:clinical||user.role==='patient'?p.problems:'Restricted',caregiver:registry||user.role==='patient'?p.caregiver:'',coverage:registry||finance||admin||user.role==='patient'?p.coverage:'Restricted'}));
  }
  if(clinical){data.encounters=structuredClone(source.encounters);data.observations=structuredClone(source.observations);data.prescriptions=structuredClone(source.prescriptions);data.stock=structuredClone(source.stock);data.admissions=structuredClone(source.admissions);data.beds=structuredClone(source.beds);data.tasks=structuredClone(source.tasks);data.orders=structuredClone(source.orders);data.documents=structuredClone(source.documents);}
  if(registry)data.documents=structuredClone(source.documents.filter(d=>d.status!=='signed'&&d.title!=='Discharge summary'));
  if(admin){data.staff=structuredClone(source.staff);data.invitations=structuredClone(source.invitations||[]);data.beds=structuredClone(source.beds);data.admissions=source.admissions.map(a=>({...a,reason:'Clinical information restricted',summary:'',followUp:''}));data.settings=structuredClone(source.settings);}
  if(['doctor','reception','admin','patient'].includes(user.role)){data.appointments=structuredClone(source.appointments.filter(a=>user.role!=='patient'||a.patientId===user.patientId));data.settings.rooms=[...source.settings.rooms];data.settings.clinicians=[...source.settings.clinicians];}
  if(user.role==='pharmacy'){data.prescriptions=structuredClone(source.prescriptions);data.stock=structuredClone(source.stock);data.movements=structuredClone(source.movements);data.procurement=structuredClone(source.procurement);}
  if(user.role==='lab'||user.role==='imaging')data.orders=structuredClone(source.orders.filter(o=>o.kind===(user.role==='lab'?'lab':'imaging')));
  if(['cashier','admin','patient'].includes(user.role)){data.invoices=structuredClone(source.invoices.filter(i=>user.role!=='patient'||i.patientId===user.patientId));data.payments=structuredClone(source.payments.filter(p=>user.role!=='patient'||p.patientId===user.patientId));}
  if(['claims','admin'].includes(user.role))data.claims=structuredClone(source.claims);
  if(admin){data.stock=structuredClone(source.stock);data.movements=structuredClone(source.movements);data.procurement=structuredClone(source.procurement);}
  if(['nurse','reception','admin'].includes(user.role))data.readings=structuredClone(source.readings);
  if(['doctor','nurse','reception','patient'].includes(user.role))data.messages=structuredClone(source.messages.filter(m=>user.role!=='patient'||m.patientId===user.patientId));
  if(user.role==='patient'){data.documents=structuredClone(source.documents.filter(d=>d.patientId===user.patientId&&d.releasedToPatient));data.orders=structuredClone(source.orders.filter(o=>o.patientId===user.patientId&&o.releasedToPatient));data.prescriptions=structuredClone(source.prescriptions.filter(r=>r.patientId===user.patientId&&['verified','partial','dispensed'].includes(r.status)));data.stock=source.stock.filter(i=>data.prescriptions.some(r=>r.itemId===i.id)).map(i=>({...i,quantity:0,price:0,location:'',batch:''}));}
  if(user.role==='platform')data.support=structuredClone(source.support);
  data.activity=structuredClone(source.activity.filter(a=>admin||a.actor===user.role&&(!['password-changed','sessions-revoked'].includes(a.action)||a.detail.includes(user.id))));data.aiReviews=[...source.aiReviews];
  const safeHospital:Hospital={id:hospital.id,name:hospital.name,plan:hospital.plan,status:hospital.status,modules:hospital.modules.filter(m=>access[user.role].includes(m)),adminEmail:admin?hospital.adminEmail:'',...(admin?{profile:hospital.profile,ownerUserId:hospital.ownerUserId,emailDomain:hospital.emailDomain}:{})};
  return {user:publicIdentity(user),demo:{schema:1 as const,hospitals:user.role==='platform'?s.demo.hospitals.map(h=>({id:h.id,name:h.name,plan:h.plan,status:h.status,modules:[],adminEmail:''})):[safeHospital],datasets:{[hospital.id]:data}},organisationId:hospital.id};
}
const actionModules:Partial<Record<CommandType,ModuleId>>={register:'patients',editPatient:'patients',merge:'patients',document:'patients',book:'appointments',appointment:'appointments',triage:'triage',encounter:'encounters',sign:'encounters',amend:'encounters',order:'encounters',prescribe:'encounters',prescription:'pharmacy',dispense:'pharmacy',admit:'admissions',transfer:'admissions',wardTask:'ward',addWardTask:'ward',dischargeDraft:'admissions',discharge:'admissions',stock:'inventory',payment:'billing',discount:'billing',refund:'billing',claim:'claims',reading:'clinic',reminder:'clinic',staff:'people',updateStaff:'people',department:'people',inviteUser:'people',invitationStatus:'people',settings:'administration',bed:'administration',procurement:'inventory',support:'platform',hospital:'platform'};
export function mutate(user:Identity,command:Command){
  const s=store(),moduleId=actionModules[command.type];
  const special=['audit','aiAudit','aiAccept','orderProgress','message','proxy','telemedicine'].includes(command.type);
  if(!moduleId&&!special)throw new AccessError(403,'This action is not permitted.');
  if(moduleId&&!allowed(user,moduleId)&&!(user.role==='patient'&&['book','payment'].includes(command.type)))throw new AccessError(403,'You do not have permission to perform this action.');
  if(command.type==='aiAccept'){
    const v=command.values||{},review=s.aiRequests.get(v.requestId);
    if(!review||review.accountId!==user.id||review.expires<=Date.now()||review.task!==v.task||review.patientId!==command.patientId||review.recordId!==command.id)throw new AccessError(403,'Generate a draft in your own workspace before accepting it.');
    if(review.version!==Number(v.contextVersion))throw new AccessError(409,'This draft is stale. Regenerate before applying.');
    if(user.role==='patient')command={...command,values:{...v,target:''}};
  }
  if(user.role==='patient'){
    const permissible=['book','appointment','payment','message','proxy','telemedicine','aiAudit','aiAccept','audit'];if(!permissible.includes(command.type))throw new AccessError(403,'Access denied.');
    if(command.patientId&&command.patientId!==user.patientId)throw new AccessError(403,'Access denied.');
    if(command.id){const d=s.demo.datasets[user.organisationId],row=[...d.appointments,...d.invoices,...d.documents,...d.orders].find(r=>r.id===command.id);if(!row||row.patientId!==user.patientId)throw new AccessError(403,'Access denied.');}
    command={...command,patientId:user.patientId};
  }
  try{s.demo=applyCommand(s.demo,user.organisationId,user.role,command);}catch(e){throw new AccessError(400,(e as Error).message);}
  if(command.type==='staff'||command.type==='updateStaff'){
    const member=s.demo.datasets[user.organisationId].staff.find(m=>m.id===command.id),account=member?s.accounts.get(member.id):undefined;
    if(member&&account){const changed=account.role!==member.role||account.department!==member.department||!member.enabled;account.name=member.name;account.role=member.role;account.department=member.department;if(changed)for(const [key,entry] of s.sessions)if(entry.accountId===account.id)s.sessions.delete(key);}
    if(account?.id===user.id&&account.role!==user.role)throw new AccessError(401,'Your access changed. Sign in again.');
  }
  if(command.type==='aiAccept')s.aiRequests.delete(command.values!.requestId);
  return workspace(publicIdentity(s.accounts.get(user.id)!));
}
export function rememberAiResult(user:Identity,requestId:string,task:string,patientId:string|undefined,recordId:string|undefined,version:number){const requests=store().aiRequests;for(const [id,r] of requests)if(r.expires<=Date.now())requests.delete(id);const existing=requests.get(requestId);if(existing&&existing.accountId!==user.id)throw new AccessError(403,'Request identifier unavailable.');requests.set(requestId,{accountId:user.id,task,patientId,recordId,version,expires:Date.now()+15*60000});}
export function updatePreferences(user:Identity,value:Record<string,unknown>){
  const account=store().accounts.get(user.id)!;
  if(typeof value.name!=='string'||value.name.trim().length<2||value.name.length>120)throw new AccessError(400,'Enter a name of 2–120 characters.');
  const timezone=typeof value.timezone==='string'?value.timezone:'Africa/Lagos';try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{throw new AccessError(400,'Choose a valid time zone.');}
  if(typeof value.emailNotifications!=='boolean'||typeof value.compactTables!=='boolean')throw new AccessError(400,'Check your preferences.');
  account.name=value.name.trim();account.preferences={timezone,emailNotifications:value.emailNotifications,compactTables:value.compactTables};
  const staff=store().demo.datasets[user.organisationId].staff.find(s=>s.id===user.id);if(staff)staff.name=account.name;
  return workspace(publicIdentity(account));
}
export function organisationProfile(user:Identity,profile:OrganisationProfile){if(user.role!=='admin')throw new AccessError(403,'Organisation profile access requires hospital administrator privileges.');for(const field of ['name','phone','address','city','state','country','type'] as const)if(typeof profile[field]!=='string'||!profile[field].trim()||profile[field].length>300)throw new AccessError(400,'Complete the required organisation details.');if(profile.website&&!/^https?:\/\//.test(profile.website))throw new AccessError(400,'Enter a website starting with https://.');const h=store().demo.hospitals.find(h=>h.id===user.organisationId)!;h.name=profile.name.trim();h.profile={...profile,adminName:h.profile?.adminName||user.name};return workspace(user);}
export function startRegistration(email:string){const s=store(),normal=workEmail(email);if(Array.from(s.accounts.values()).some(a=>a.email===normal)||s.demo.hospitals.some(h=>h.emailDomain===normal.split('@')[1]))throw new AccessError(409,'Use sign-in or ask your organisation administrator for an invitation.');const transaction=token(),link=token();s.registrations.set(hash(transaction),{email:normal,linkHash:hash(link),expires:Date.now()+15*60000,verified:false,previewLink:link});return {transaction,email:normal,verificationUrl:`/auth/verify-email?token=${encodeURIComponent(link)}`};}
function registration(transaction:string|undefined){const r=transaction?store().registrations.get(hash(transaction)):undefined;if(!r||r.expires<=Date.now())throw new AccessError(401,'Verification expired. Start again with your work email.');return r;}
export function verifyRegistration(transaction:string|undefined,link:string){const r=registration(transaction);if(hash(link)!==r.linkHash)throw new AccessError(400,'Invalid verification link.');r.verified=true;return {email:r.email,verified:true};}
export function registrationStatus(transaction:string|undefined){const r=registration(transaction);return {email:r.email,verified:r.verified,verificationUrl:`/auth/verify-email?token=${encodeURIComponent(r.previewLink)}`};}
function validatePassword(password:string){if(password.length<12||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password))throw new AccessError(400,'Use 12–128 characters including upper/lowercase letters and a number.');}
export function finishRegistration(transaction:string|undefined,profile:OrganisationProfile,password:string){const s=store(),r=registration(transaction);validatePassword(password);if(!r.verified)throw new AccessError(403,'Verify your work email first.');const pending:EmailVerification={email:r.email,token:'server-verified',expiresAt:new Date(r.expires).toISOString(),verified:true,kind:'new'};const result=createOrganisation(s.demo,pending,profile);s.demo=result.demo;const account:Account={id:result.session.staffId,name:profile.adminName,email:r.email,organisationId:result.session.organisationId,role:'admin',department:'Administration',passwordHash:passwordHash(password),preferences:defaults()};s.accounts.set(account.id,account);s.registrations.delete(hash(transaction!));return issueSession(account);}
export function invitationInfo(link:string){const s=store();for(const h of s.demo.hospitals){const i=s.demo.datasets[h.id].invitations?.find(i=>i.token===link&&i.status==='invited');if(i&&Date.parse(i.expiresAt)>Date.now())return {organisationName:h.name,email:i.email,role:i.role,department:i.department,name:s.demo.datasets[h.id].staff.find(u=>u.id===i.staffId)?.name||''};}throw new AccessError(404,'This invitation is invalid, expired or revoked.');}
export function acceptInvitation(link:string,password:string){validatePassword(password);const s=store(),info=invitationInfo(link);if(Array.from(s.accounts.values()).some(a=>a.email===info.email))throw new AccessError(409,'This account already exists. Contact your administrator.');const result=acceptDepartmentInvitation(s.demo,link);s.demo=result.demo;const account:Account={id:result.session.staffId,email:info.email,name:info.name,role:result.session.role,organisationId:result.session.organisationId,department:info.department,passwordHash:passwordHash(password),preferences:defaults()};s.accounts.set(account.id,account);return issueSession(account);}
