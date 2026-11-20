import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { DepartmentInvitation, LoginScreen, OrganisationOnboarding, SignInHelp } from '@/components/organisation-onboarding';
const screens=['sign-in','get-started','check-email','verify-email','organisation','invitation','forgot-password','workspace'];
export function generateStaticParams(){return screens.map(screen=>({screen}));}
async function Content({params,searchParams}:{params:Promise<{screen:string}>;searchParams:Promise<{token?:string}>}){const {screen}=await params;if(!screens.includes(screen))notFound();if(screen==='workspace')redirect('/capabilities');if(screen==='sign-in')return <LoginScreen/>;if(screen==='forgot-password')return <SignInHelp/>;if(screen==='invitation'){const {token}=await searchParams;return token?<DepartmentInvitation token={token}/>:<SignInHelp/>;}return <OrganisationOnboarding screen={screen} token={screen==='verify-email'?(await searchParams).token:undefined}/>;}
export default function Page(props:{params:Promise<{screen:string}>;searchParams:Promise<{token?:string}>}){return <Suspense fallback={<main className="demo-loading">Loading account access…</main>}><Content {...props}/></Suspense>;}
