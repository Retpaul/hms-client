"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
export interface Feedback {kind:'success'|'error'|'info';message:string;id:number}
import { access, type Command, type DemoState, type HospitalData, type ModuleId, type RoleId } from '@/lib/demo/types';
import type { Identity } from '@/lib/server/access';

export interface WorkspaceSnapshot { user:Identity;demo:DemoState;organisationId:string }
export async function authenticatedRequest<T>(path:string,body?:unknown):Promise<T>{
  const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();if(!response.ok){if(response.status===401&&(path.startsWith('/api/workspace')||path.startsWith('/api/settings')))window.location.replace('/auth/sign-in');throw new Error(result.error?.message||'Unable to complete this request.');}return result as T;
}
interface ContextValue {state:DemoState;data:HospitalData;organisationId:string;role:RoleId;user:Identity;offline:boolean;notice:string;feedback:Feedback|null;scenario:'success';execute:(command:Command)=>Promise<boolean>;href:(module:ModuleId,id?:string)=>string;can:(module:ModuleId)=>boolean;notify:(text:string,kind?:Feedback['kind'])=>void;refresh:()=>Promise<void>;saveSettings:(body:unknown)=>Promise<boolean>}
const Context=createContext<ContextValue|null>(null);
export function DemoProvider({role,children}:{role:RoleId;children:ReactNode}){
  const [snapshot,setSnapshot]=useState<WorkspaceSnapshot|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),[feedback,setFeedback]=useState<Feedback|null>(null);
  const notify=useCallback((message:string,kind:Feedback['kind']='info')=>{setNotice(message);setFeedback(message?{kind,message,id:Date.now()}:null);if(message)toast[kind](message);},[]);
  const refresh=useCallback(async()=>{const result=await authenticatedRequest<WorkspaceSnapshot>('/api/workspace');setSnapshot(result);},[]);
  useEffect(()=>{let active=true;sessionStorage.removeItem('hms-demo-v1');authenticatedRequest<WorkspaceSnapshot>('/api/workspace').then(value=>{if(active)setSnapshot(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  useEffect(()=>{const restore=(event:PageTransitionEvent)=>{if(event.persisted){setSnapshot(null);void refresh().catch(()=>window.location.replace('/auth/sign-in'));}};window.addEventListener('pageshow',restore);return()=>window.removeEventListener('pageshow',restore);},[refresh]);
  const execute=useCallback(async(command:Command)=>{try{const result=await authenticatedRequest<WorkspaceSnapshot>('/api/workspace',command);setSnapshot(result);if(!['audit','aiAudit'].includes(command.type))notify('Changes saved.','success');return true;}catch(e){notify((e as Error).message,'error');return false;}},[notify]);
  if(error)return <main className="demo-loading"><div><p role="alert">{error}</p><Link className="button" href="/auth/sign-in">Return to sign in</Link></div></main>;
  if(!snapshot)return <main className="demo-loading" aria-busy="true"><div className="w-full max-w-xl space-y-4 p-6"><p>Loading your workspace…</p><Skeleton className="h-10 w-2/3"/><Skeleton className="h-48 w-full"/><Skeleton className="h-10 w-full"/></div></main>;
  if(snapshot.user.role!==role)return <main className="demo-loading">This workspace is outside your assigned role. <a href={`/dashboard/${snapshot.user.role}`}>Open your workspace</a></main>;
  const value:ContextValue={state:snapshot.demo,data:snapshot.demo.datasets[snapshot.organisationId],organisationId:snapshot.organisationId,role:snapshot.user.role,user:snapshot.user,offline:false,notice,feedback,scenario:'success',execute,refresh,notify,
    href:(moduleId,id)=>`/dashboard/${snapshot.user.role}/${moduleId}${id?`/${encodeURIComponent(id)}`:''}`,
    can:(moduleId)=>access[snapshot.user.role].includes(moduleId)&&(snapshot.user.role==='platform'||['settings','people','organisation'].includes(moduleId)||snapshot.demo.hospitals[0]?.modules.includes(moduleId)),
    saveSettings:async(body)=>{try{setSnapshot(await authenticatedRequest<WorkspaceSnapshot>('/api/settings',body));notify('Settings saved.','success');return true;}catch(e){notify((e as Error).message,'error');return false;}},
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDemo(){const value=useContext(Context);if(!value)throw new Error('Workspace provider required.');return value;}
