import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function GET(){const user=await getChatGPTUser();return Response.json(user?{name:user.displayName,email:user.email}:null,{headers:{'Cache-Control':'private, no-store'}})}
