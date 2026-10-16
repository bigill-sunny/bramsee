import {currentUser,publicUser} from '@/lib/auth';
export async function GET(r:Request){const user=await currentUser(r);return Response.json(user?publicUser(user):null,{headers:{'Cache-Control':'private, no-store'}})}
