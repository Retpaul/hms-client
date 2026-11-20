import { home } from '@/lib/server/access';
import { failure, identity, json } from '@/lib/server/http';
export async function GET(){try{const user=await identity();return json({user,redirectTo:home(user)});}catch(e){return failure(e);}}
