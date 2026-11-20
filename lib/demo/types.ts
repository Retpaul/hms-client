export const roleIds = ['doctor', 'nurse', 'records', 'reception', 'pharmacy', 'lab', 'imaging', 'cashier', 'claims', 'admin', 'platform', 'patient'] as const;
export type RoleId = typeof roleIds[number];
export const modules = ['overview', 'patients', 'appointments', 'triage', 'encounters', 'pharmacy', 'laboratory', 'imaging', 'admissions', 'ward', 'inventory', 'billing', 'claims', 'telemedicine', 'portal', 'clinic', 'people', 'settings', 'organisation', 'administration', 'platform', 'activity'] as const;
export type ModuleId = typeof modules[number];
export type Row = { id: string; patientId?: string; status: string; version: number; createdAt: string };
export interface Patient extends Row { name: string; dob: string; sex: string; phone: string; address: string; nextOfKin: string; identifier: string; allergies: string; problems: string; coverage: string; consent: boolean; caregiver: string; proxy: boolean; mergedInto?: string }
export interface Appointment extends Row { patientId: string; date: string; time: string; clinician: string; room: string; mode: string; reason: string; reminders: boolean; virtual?:{ stage:string;consent:boolean;identity:boolean;intake:string;chat:string[] } }
export interface Encounter extends Row { patientId: string; appointmentId?: string; complaint: string; diagnosis: string; note: string; amendments: string[]; referral: string; followUp: string; signedAt?: string }
export interface Observation extends Row { patientId: string; systolic: number; diastolic: number; pulse: number; temperature: number; spo2: number; pain: number; note: string; source: string }
export interface ClinicalOrder extends Row { patientId: string; encounterId: string; kind: 'lab' | 'imaging'; name: string; specimen: string; result: string; unit: string; range: string; flag: string; history: string[]; releasedToPatient: boolean; criticalAcknowledged: boolean }
export interface Prescription extends Row { patientId: string; encounterId: string; itemId: string; instruction: string; quantity: number; issued: number; overrideReason: string; clarification: string }
export interface StockItem extends Row { name: string; batch: string; expiry: string; location: string; quantity: number; threshold: number; price: number }
export interface StockMovement extends Row { itemId: string; quantity: number; location: string; reason: string; sourceId: string }
export interface Admission extends Row { patientId: string; bedId: string; previousBeds: string[]; reason: string; summary: string; reconciled: boolean; followUp: string }
export interface Bed extends Row { name: string; ward: string }
export interface WardTask extends Row { patientId: string; admissionId: string; kind: string; title: string; due: string; outcome: string; reason: string; prescriptionId?:string }
export interface Invoice extends Row { patientId: string; sourceId: string; label: string; amount: number; paid: number; discount: number; discountRequested: number }
export interface Payment extends Row { patientId: string; invoiceId: string; amount: number; method: string; reference: string }
export interface Claim extends Row { patientId: string; payer: string; authorisation: string; documents: boolean; amount: number; paid: number; rejection: string; submissions: string[] }
export interface Document extends Row { patientId: string; title: string; content: string; releasedToPatient: boolean }
export interface Message extends Row { patientId: string; subject: string; body: string; sender: string }
export interface Reading extends Row { patientId: string; observation: Omit<Observation, keyof Row | 'patientId'>; device: string; capturedAt: string; duplicateOf?: string }
export interface Staff extends Row { name: string; role: RoleId; department: string; enabled: boolean; email?:string; owner?:boolean }
export interface StaffInvitation { id:string;staffId:string;email:string;role:RoleId;department:string;token:string;expiresAt:string;status:'invited'|'accepted'|'revoked' }
export interface Audit extends Row { actor: RoleId; action: string; detail: string }
export interface Hospital { id: string; name: string; plan: string; status: string; modules: ModuleId[]; adminEmail: string; emailDomain?:string; ownerUserId?:string; profile?:{name:string;adminName:string;type:string;phone:string;address:string;city:string;state:string;country:string;website:string}; createdAt?:string }
export interface HospitalData { version: number; portalPatientId:string; patients: Patient[]; appointments: Appointment[]; encounters: Encounter[]; observations: Observation[]; orders: ClinicalOrder[]; prescriptions: Prescription[]; stock: StockItem[]; movements: StockMovement[]; admissions: Admission[]; beds: Bed[]; tasks: WardTask[]; invoices: Invoice[]; payments: Payment[]; claims: Claim[]; documents: Document[]; messages: Message[]; readings: Reading[]; staff: Staff[]; invitations?:StaffInvitation[]; activity: Audit[]; aiReviews: string[]; settings: { rooms: string[]; clinicians: string[]; departments: string[]; departmentDescriptions?:Record<string,string>; consultationFee: number; aiEnabled: boolean; reminders: boolean }; procurement: { id: string; title: string; status: string }[]; support: { id: string; title: string; status: string }[] }
export interface DemoState { schema: 1; hospitals: Hospital[]; datasets: Record<string, HospitalData> }
export type CommandType = 'register' | 'editPatient' | 'merge' | 'proxy' | 'document' | 'book' | 'appointment' | 'triage' | 'encounter' | 'sign' | 'amend' | 'order' | 'orderProgress' | 'prescribe' | 'prescription' | 'dispense' | 'admit' | 'transfer' | 'wardTask' | 'addWardTask' | 'dischargeDraft' | 'discharge' | 'stock' | 'payment' | 'discount' | 'refund' | 'claim' | 'message' | 'reading' | 'reminder' | 'department' | 'inviteUser' | 'invitationStatus' | 'staff' | 'updateStaff' | 'settings' | 'bed' | 'procurement' | 'support' | 'hospital' | 'telemedicine' | 'audit' | 'aiAudit' | 'aiAccept';
export interface Command { type: CommandType; id?: string; patientId?: string; values?: Record<string, string> }
export const access: Record<RoleId, ModuleId[]> = {
  doctor: ['overview','patients','appointments','encounters','laboratory','imaging','admissions','ward','telemedicine','activity','settings'],
  nurse: ['overview','patients','triage','admissions','ward','clinic','activity','settings'],
  records: ['overview','patients','activity','settings'], reception: ['overview','patients','appointments','telemedicine','clinic','activity','settings'],
  pharmacy: ['overview','patients','pharmacy','inventory','activity','settings'], lab: ['overview','laboratory','activity','settings'], imaging: ['overview','imaging','activity','settings'],
  cashier: ['overview','billing','activity','settings'], claims: ['overview','claims','activity','settings'],
  admin: ['overview','patients','appointments','admissions','inventory','billing','claims','clinic','people','organisation','administration','activity','settings'],
  platform: ['overview','platform','activity','settings'], patient: ['overview','portal','telemedicine','settings'],
};
export const moduleNames: Record<ModuleId,string> = { overview:'Overview', patients:'Patient records', appointments:'Appointments', triage:'Triage', encounters:'Consultations', pharmacy:'Pharmacy', laboratory:'Laboratory', imaging:'Imaging', admissions:'Admissions & beds', ward:'Ward care', inventory:'Inventory', billing:'Billing & payments', claims:'HMO & claims', telemedicine:'Telemedicine', portal:'My health', clinic:'Smart clinic', people:'People', settings:'Settings', organisation:'Organisation profile', administration:'Hospital settings', platform:'Platform operations', activity:'Activity history' };
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
export const money = (n: number) => new Intl.NumberFormat('en-NG', { style:'currency', currency:'NGN', maximumFractionDigits:0 }).format(n);
export const stamp = () => new Date().toISOString();
export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function base(id: string, status: string): Row { return { id, status, version:1, createdAt:stamp() }; }
