import { cookies } from 'next/headers';
import { login, sessionCookie } from '@/lib/server/access';
import { failure, input, sessionResponse, text } from '@/lib/server/http';
export async function POST(request:Request){try{const body=await input(request);return sessionResponse(login(text(body.email),text(body.password,128),(await cookies()).get(sessionCookie)?.value,request.headers.get('user-agent')||''));}catch(e){return failure(e);}}
