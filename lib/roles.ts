import type { RoleId } from './demo/types';
export interface HospitalRole {id:RoleId;name:string;desc:string}
export const roles:HospitalRole[] = [
  {id:'doctor',name:'Doctor',desc:'Consultations, clinical records, prescriptions and follow-up.'},
  {id:'nurse',name:'Nurse',desc:'Triage, observations, ward care and medication administration.'},
  {id:'records',name:'Records officer',desc:'Patient registration, identity, documents and caregiver permissions.'},
  {id:'reception',name:'Receptionist',desc:'Appointments, patient arrivals, queues and clinic coordination.'},
  {id:'pharmacy',name:'Pharmacist',desc:'Prescription verification, dispensing, stock and procurement.'},
  {id:'lab',name:'Laboratory staff',desc:'Requests, specimens, reporting and result release.'},
  {id:'imaging',name:'Imaging staff',desc:'Examination scheduling, reporting and released investigations.'},
  {id:'cashier',name:'Cashier',desc:'Invoices, payments, receipts and reconciliation.'},
  {id:'claims',name:'Claims officer',desc:'HMO authorisations, claim submissions and remittances.'},
  {id:'admin',name:'Hospital administrator',desc:'Hospital operations, staff, services, beds and settings.'},
  {id:'platform',name:'Platform administrator',desc:'Customer organisations, subscriptions and support.'},
  {id:'patient',name:'Patient / caregiver',desc:'Appointments, released records, prescriptions, invoices and messages.'},
];
