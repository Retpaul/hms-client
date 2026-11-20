import { cookies } from 'next/headers';
import { AccessError, finishRegistration, registrationCookie, registrationStatus, startRegistration, verifyRegistration } from '@/lib/server/access';
import { failure, input, json, sessionResponse, text } from '@/lib/server/http';
import type { OrganisationProfile } from '@/lib/demo/organisation';
export async function GET(){try{return json(registrationStatus((await cookies()).get(registrationCookie)?.value));}catch(e){return failure(e);}}
export async function POST(request:Request){try{const body=await input(request),transaction=(await cookies()).get(registrationCookie)?.value;
  if(body.action==='start'){const result=startRegistration(text(body.email));const response=json({email:result.email,verificationUrl:result.verificationUrl});response.cookies.set(registrationCookie,result.transaction,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:900});return response;}
  if(body.action==='verify')return json(verifyRegistration(transaction,text(body.token,200)));
  if(body.action==='complete'){if(!body.profile||typeof body.profile!=='object')throw new AccessError(400,'Organisation profile required.');const source=body.profile as Record<string,unknown>,profile=Object.fromEntries(['name','adminName','type','phone','address','city','state','country','website'].map(k=>[k,text(source[k],300)])) as unknown as OrganisationProfile;return sessionResponse(finishRegistration(transaction,profile,text(body.password,128)));}
  throw new AccessError(400,'Unknown onboarding action.');
}catch(e){return failure(e);}}
