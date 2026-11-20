import { cookies } from 'next/headers';
import { logout, sessionCookie } from '@/lib/server/access';
import { failure, json, sameOrigin } from '@/lib/server/http';
export async function POST(request:Request){try{sameOrigin(request);logout((await cookies()).get(sessionCookie)?.value);const response=json({ok:true});response.cookies.set(sessionCookie,'',{httpOnly:true,path:'/',sameSite:'strict',maxAge:0});return response;}catch(e){return failure(e);}}
