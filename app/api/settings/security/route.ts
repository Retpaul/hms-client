import { cookies } from 'next/headers';
import { AccessError, accountSecurity, changePassword, revokeSessions, sessionCookie } from '@/lib/server/access';
import { failure, identity, input, json, sessionResponse, text } from '@/lib/server/http';
export async function GET(){try{const user=await identity();return json(accountSecurity(user,(await cookies()).get(sessionCookie)?.value));}catch(e){return failure(e);}}
export async function POST(request:Request){try{const user=await identity(),body=await input(request),raw=(await cookies()).get(sessionCookie)?.value;if(['accountId','organisationId','role','userId'].some(k=>k in body))throw new AccessError(403,'Account security changes apply only to your signed-in account.');
  if(body.action==='password')return sessionResponse(changePassword(user,raw,text(body.currentPassword,128),text(body.newPassword,128),request.headers.get('user-agent')||''));
  if(body.action==='revoke-others')return json(revokeSessions(user,raw,'others'));
  if(body.action==='revoke-one')return json(revokeSessions(user,raw,'one',text(body.sessionId,100)));
  if(body.action==='revoke-all'){const result=revokeSessions(user,raw,'all'),response=json({...result,signedOut:true});response.cookies.set(sessionCookie,'',{path:'/',httpOnly:true,sameSite:'strict',maxAge:0});return response;}
  throw new AccessError(400,'Unknown account security action.');
}catch(e){return failure(e);}}
