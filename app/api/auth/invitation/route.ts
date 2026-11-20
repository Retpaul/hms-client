import { acceptInvitation, invitationInfo } from '@/lib/server/access';
import { failure, input, json, sessionResponse, text } from '@/lib/server/http';
export async function GET(request:Request){try{return json(invitationInfo(new URL(request.url).searchParams.get('token')||''));}catch(e){return failure(e);}}
export async function POST(request:Request){try{const body=await input(request);return sessionResponse(acceptInvitation(text(body.token,200),text(body.password,128)));}catch(e){return failure(e);}}
