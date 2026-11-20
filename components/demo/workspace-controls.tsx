"use client";

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Bell, Building2, ChevronDown, LogOut, Search, ShieldCheck, UserRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useGuardedNavigate, useConfirm } from '@/components/shared/confirmation';
import { access, moduleNames } from '@/lib/demo/types';
import { useDemo } from './provider';

export function IconControl({label,children,onClick}:{label:string;children:ReactNode;onClick:()=>void}) {
  return <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} onClick={onClick}/>}>{children}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}
export function AccountMenu({roleName,expanded=false}:{roleName:string;expanded?:boolean}) {
  const {user,can,href,notify}=useDemo(),[pending,setPending]=useState(false),navigate=useGuardedNavigate(),confirm=useConfirm();
  const initials=user.name.split(' ').slice(0,2).map(part=>part[0]).join('');
  async function signOut(){
    if(pending)return;
    if(document.querySelector('form[data-dirty="true"]')&&!await confirm({title:'Sign out with unsaved changes?',description:'Your unsaved form changes will be lost.',confirmLabel:'Sign out',destructive:true}))return;
    setPending(true);
    try{const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});if(!response.ok)throw new Error('Unable to sign out. Try again.');document.querySelectorAll('form[data-dirty="true"]').forEach(form=>form.setAttribute('data-dirty','false'));sessionStorage.removeItem('hms-demo-v1');window.location.replace('/auth/sign-in');}
    catch(error){notify((error as Error).message,'error');setPending(false);}
  }
  return <DropdownMenu><DropdownMenuTrigger disabled={pending} render={<button className="hms-account-trigger" aria-label={expanded?'Open account menu':'My account menu'}/>}><Avatar className="size-9 bg-blue-50 text-primary"><AvatarFallback>{initials}</AvatarFallback></Avatar>{expanded&&<div><strong>{user.name}</strong><small>{roleName}</small></div>}<ChevronDown className="size-3 text-muted-foreground"/></DropdownMenuTrigger><DropdownMenuContent align="end" className="hms-overlay w-72 p-2"><DropdownMenuGroup><DropdownMenuLabel><span className="block text-sm font-semibold text-foreground">{user.name}</span><span className="block break-all font-normal">{user.email}</span><span className="mt-2 block text-xs text-primary">{roleName}</span></DropdownMenuLabel></DropdownMenuGroup><DropdownMenuSeparator/><DropdownMenuItem onClick={()=>navigate(href('settings'))}><UserRound/>My account</DropdownMenuItem><DropdownMenuItem onClick={()=>navigate(href('settings','security'))}><ShieldCheck/>Security</DropdownMenuItem>{user.role==='admin'&&can('organisation')&&<DropdownMenuItem onClick={()=>navigate(href('organisation'))}><Building2/>Organisation settings</DropdownMenuItem>}<DropdownMenuSeparator/><DropdownMenuItem variant="destructive" disabled={pending} onClick={signOut}>{pending?<Loader2 className="animate-spin"/>:<LogOut/>}{pending?'Signing out…':'Sign out'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
export function RecentActivity(){
  const {data,user,can,href}=useDemo();
  return <Popover><Tooltip><TooltipTrigger render={<PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Recent activity"/>}/> }><Bell className="size-5"/></TooltipTrigger><TooltipContent>Recent activity</TooltipContent></Tooltip><PopoverContent align="end" className="hms-overlay w-80 max-w-[calc(100vw-24px)]"><h2 className="text-sm font-semibold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Activity available to your account.</p>{data.activity.length?data.activity.slice(0,5).map(event=><article key={event.id} className="hms-recent-item"><strong className="text-sm capitalize">{event.action.replaceAll('-',' ')}</strong><small>{new Date(event.createdAt).toLocaleString('en-NG',{timeZone:user.preferences.timezone})}</small></article>):<p className="py-6 text-sm text-muted-foreground">No recent activity.</p>}{can('activity')&&<Link href={href('activity')} className="mt-3 block text-sm font-medium text-primary">View activity history →</Link>}</PopoverContent></Popover>;
}
export function NavigationSearch(){
  const {role,can,href}=useDemo(),[open,setOpen]=useState(false),navigate=useGuardedNavigate();
  useEffect(()=>{const shortcut=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){if(document.querySelector('[role="alertdialog"]'))return;event.preventDefault();setOpen(value=>!value);}};document.addEventListener('keydown',shortcut);return()=>document.removeEventListener('keydown',shortcut);},[]);
  async function go(path:string){setOpen(false);await navigate(path);}
  return <><Button variant="outline" className="gap-2 text-muted-foreground" aria-label="Search workspace navigation" onClick={()=>setOpen(true)}><Search className="size-4"/><span className="hms-search-label">Find a page <kbd className="ml-3 text-xs">⌘ / Ctrl K</kbd></span></Button><CommandDialog open={open} onOpenChange={setOpen} title="Find a page" description="Search pages available to your assigned role." className="hms-overlay"><CommandInput placeholder="Search your workspace…"/><CommandList><CommandEmpty>No available pages match your search.</CommandEmpty><CommandGroup heading="Your workspace">{access[role].filter(can).map(moduleId=><CommandItem key={moduleId} value={moduleNames[moduleId]} onSelect={()=>go(href(moduleId))}>{moduleNames[moduleId]}</CommandItem>)}</CommandGroup><CommandGroup heading="Account"><CommandItem onSelect={()=>go(href('settings','security'))}>Security settings</CommandItem></CommandGroup></CommandList></CommandDialog></>;
}
