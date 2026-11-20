import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { roles } from '@/lib/roles';
import { Workspace } from '@/components/workspace';
import { requirePageAccess } from '@/lib/server/pages';
import { modules, type ModuleId } from '@/lib/demo/types';
export function generateStaticParams(){return [{view:['overview']}];}
async function Content({params}:{params:Promise<{role:string;view:string[]}>}){const {role:id,view}=await params;const role=roles.find(r=>r.id===id);if(!role||view.length>2||!modules.includes(view[0] as ModuleId))notFound();await requirePageAccess(id,view[0] as ModuleId);return <Workspace key={`${role.id}-${view.join('/')}`} role={role} view={view}/>;}
export default function Page({params}:{params:Promise<{role:string;view:string[]}>}){return <Suspense fallback={<main className="demo-loading">Loading workspace…</main>}><Content params={params}/></Suspense>;}
