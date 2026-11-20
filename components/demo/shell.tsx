"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Brand, Icon } from '@/components/shared/identity';
import { type HospitalRole } from '@/lib/roles';
import { access, moduleNames, type ModuleId, type RoleId } from '@/lib/demo/types';
import { DemoProvider, useDemo } from './provider';
import { Panel } from './primitives';
import { Overview } from './overview';
import { Appointments, Encounters, Investigations, Patients, Pharmacy, Triage } from './clinical';
import { Activity, Administration, Admissions, Billing, Claims, Clinic, Inventory, Platform } from './operations';
import { Portal, Telemedicine } from './virtual-care';
import { People } from './people';
import { OrganisationSettings, PersonalSettings } from './settings';
import { AccountMenu, RecentActivity, NavigationSearch, IconControl } from './workspace-controls';
import { ConfirmationProvider } from '@/components/shared/confirmation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const icons:Record<ModuleId,string>={overview:'grid',patients:'record',appointments:'calendar',triage:'heart',encounters:'doctor',pharmacy:'pharmacy',laboratory:'lab',imaging:'imaging',admissions:'nurse',ward:'heart',inventory:'pharmacy',billing:'cashier',claims:'claims',telemedicine:'doctor',portal:'heart',clinic:'chart',people:'admin',settings:'admin',organisation:'admin',administration:'admin',platform:'platform',activity:'clock'};
function Screens({moduleId,id}:{moduleId:ModuleId;id?:string}) {
  switch(moduleId){case 'overview':return <Overview/>;case 'patients':return <Patients recordId={id}/>;case 'appointments':return <Appointments recordId={id}/>;case 'triage':return <Triage recordId={id}/>;case 'encounters':return <Encounters recordId={id}/>;case 'pharmacy':return <Pharmacy recordId={id}/>;case 'laboratory':return <Investigations kind="lab" recordId={id}/>;case 'imaging':return <Investigations kind="imaging" recordId={id}/>;case 'admissions':return <Admissions recordId={id}/>;case 'ward':return <Admissions recordId={id} ward/>;case 'inventory':return <Inventory recordId={id}/>;case 'billing':return <Billing recordId={id}/>;case 'claims':return <Claims recordId={id}/>;case 'telemedicine':return <Telemedicine recordId={id}/>;case 'portal':return <Portal recordId={id}/>;case 'clinic':return <Clinic recordId={id}/>;case 'people':return <People department={id}/>;case 'settings':return <PersonalSettings tabId={id}/>;case 'organisation':return <OrganisationSettings/>;case 'administration':return <Administration/>;case 'platform':return <Platform/>;case 'activity':return <Activity/>;}
}
function Shell({role,view}:{role:HospitalRole;view:string[]}){
  const workspace=useDemo(),[menu,setMenu]=useState(false);
  const moduleId=(view[0]||(role.id==='admin'?'people':'overview')) as ModuleId,hospital=workspace.state.hospitals.find(h=>h.id===workspace.organisationId)!,recordId=view[1],{execute,user,organisationId}=workspace;
  useEffect(()=>{void execute({type:'audit',values:{action:'record-read',detail:`${moduleId}${recordId?` / ${recordId}`:''}`}});},[execute,organisationId,moduleId,recordId]);
  const navigation=<nav aria-label="Workspace navigation">{access[workspace.role].filter(module=>workspace.can(module)).map(module=><Link key={module} href={workspace.href(module)} className={moduleId===module?'active':''} aria-current={moduleId===module?'page':undefined} onClick={()=>setMenu(false)}><Icon name={icons[module]} size={19}/><span>{moduleNames[module]}</span></Link>)}</nav>;
  return <div className={`demo-app ${user.preferences.compactTables?'compact-tables':''}`}>
    <aside className="demo-sidebar"><div className="demo-sidebar-brand"><Brand/></div><div className="demo-hospital"><span>✚</span><div><strong>{hospital.name}</strong><small>{role.name}</small></div></div><span className="demo-nav-label">WORKSPACE</span>{navigation}<div className="demo-sidebar-footer"><AccountMenu roleName={role.name} expanded/></div></aside>
    <Sheet open={menu} onOpenChange={setMenu}><SheetContent side="left" className="hms-overlay hms-mobile-nav"><SheetHeader><SheetTitle>Workspace navigation</SheetTitle><SheetDescription>{hospital.name} · {role.name}</SheetDescription></SheetHeader><div className="px-4 pb-5"><Brand/>{navigation}<div className="mt-6 border-t pt-4"><AccountMenu roleName={role.name} expanded/></div></div></SheetContent></Sheet>
    <div className="demo-app-main"><header className="demo-topbar"><div className="demo-menu"><IconControl label="Open navigation" onClick={()=>setMenu(true)}><Icon name="menu"/></IconControl></div><nav className="demo-breadcrumb" aria-label="Breadcrumb"><Link href={workspace.href(role.id==='admin'?'people':'overview')}>Workspace</Link><span aria-hidden="true">/</span><strong aria-current="page">{moduleNames[moduleId]||'Unavailable'}</strong></nav><div className="demo-topbar-actions"><NavigationSearch/><RecentActivity/><AccountMenu roleName={role.name}/></div></header>
    <main className="demo-content"><div className="demo-page-heading"><div><span className="eyebrow">{role.name.toUpperCase()} WORKSPACE</span><h1>{moduleNames[moduleId]||'Unavailable screen'}</h1><p>{new Date().toLocaleDateString('en-NG',{timeZone:user.preferences.timezone,weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {hospital.name}</p></div><div className="assigned-access"><Icon name="lock" size={15}/><span>{role.name}</span></div></div>{workspace.can(moduleId)?<Screens key={`${organisationId}-${moduleId}-${recordId||''}`} moduleId={moduleId} id={recordId}/>:<Panel title="Access restricted"><p>You do not have permission to view this page.</p></Panel>}<footer className="demo-footer"><span>HMS · Connected care.</span><span>Access is limited to your assigned permissions.</span></footer></main></div>
  </div>;
}
export function HospitalWorkspace({role,view=[]}:{role:HospitalRole;view?:string[]}){return <TooltipProvider><ConfirmationProvider><DemoProvider role={role.id as RoleId}><Shell role={role} view={view}/></DemoProvider><Toaster richColors closeButton position="bottom-right"/></ConfirmationProvider></TooltipProvider>;}
