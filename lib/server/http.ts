import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AccessError, registrationCookie, session, sessionCookie, type Identity } from './access';

export const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export function json(value:unknown,status=200){return NextResponse.json(value,{status,headers:privateHeaders});}
export function failure(error:unknown){if(error instanceof AccessError)return json({error:{message:error.message}},error.status);return json({error:{message:'Unable to complete this request.'}},400);}
export async function identity():Promise<Identity>{const user=session((await cookies()).get(sessionCookie)?.value);if(!user)throw new AccessError(401,'Sign in to continue.');return user;}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new AccessError(403,'Request origin is not permitted.');}
export async function input(request:Request):Promise<Record<string,unknown>>{
  sameOrigin(request);if(!request.headers.get('content-type')?.includes('application/json'))throw new AccessError(415,'Use a JSON request.');
  const reader=request.body?.getReader();if(!reader)throw new AccessError(400,'Request body required.');let size=0,text='';const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new AccessError(413,'Request is too large.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();const body:unknown=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw new AccessError(400,'Invalid request.');return body as Record<string,unknown>;
}
export function text(value:unknown,max=254){if(typeof value!=='string'||value.length>max)throw new AccessError(400,'Check the submitted fields.');return value;}
export function sessionResponse(result:{token:string;redirectTo:string;user:Identity}){const response=json({user:result.user,redirectTo:result.redirectTo});response.cookies.set(sessionCookie,result.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*3600});response.cookies.set(registrationCookie,'',{httpOnly:true,path:'/',maxAge:0,sameSite:'strict'});return response;}
