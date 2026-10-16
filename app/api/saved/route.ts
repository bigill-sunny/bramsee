import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {profiles} from '@/db/schema';
import {eq} from 'drizzle-orm';
export async function GET(){const u=await getChatGPTUser();if(!u)return Response.json({error:'Sign in to sync favourites'},{status:401});const rows=await getDb().select().from(profiles).where(eq(profiles.user,u.userId));return Response.json(JSON.parse(rows[0]?.saved||'[]'),{headers:{'Cache-Control':'private, no-store'}})}
export async function POST(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)return new Response(null,{status:403});const u=await getChatGPTUser();if(!u)return new Response(null,{status:401});const body=await r.text();if(body.length>30000)return new Response(null,{status:413});let saved;try{saved=JSON.parse(body)}catch{return new Response(null,{status:400})}if(!Array.isArray(saved)||saved.length>100||saved.some(x=>typeof x!=='string'||x.length>100))return new Response(null,{status:400});await getDb().insert(profiles).values({user:u.userId,saved:JSON.stringify(saved)}).onConflictDoUpdate({target:profiles.user,set:{saved:JSON.stringify(saved)}});return Response.json({ok:true})}
