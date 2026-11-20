import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { allowed, home, session, sessionCookie } from './access';
import type { ModuleId } from '@/lib/demo/types';
export async function requirePageAccess(role:string,moduleId?:ModuleId){await connection();const user=session((await cookies()).get(sessionCookie)?.value);if(!user)redirect('/auth/sign-in');if(user.role!==role||moduleId&&!allowed(user,moduleId))redirect(home(user));return user;}
