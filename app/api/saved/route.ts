import {readBody} from '@/lib/request-body';
import {currentUser} from '@/lib/auth';
import {getDb} from '@/db';
import {profiles} from '@/db/schema';
import {eq} from 'drizzle-orm';
export async function GET(r:Request){const u=await currentUser(r);if(!u)return Response.json({error:'Sign in to sync favourites'},{status:401});const rows=await getDb().select().from(profiles).where(eq(profiles.user,u.userId));return Response.json(JSON.parse(rows[0]?.saved||'[]'),{headers:{'Cache-Control':'private, no-store'}})}
export async function POST(r:Request){let body:string;try{body=new TextDecoder().decode(await readBody(r,30000))}catch{return new Response(null,{status:413})}if(r.headers.get('origin')!==new URL(r.url).origin)return new Response(null,{status:403});const u=await currentUser(r);if(!u)return new Response(null,{status:401});if(r.headers.get('X-Bramsee-Account')!==u.userId)return new Response(null,{status:409});let saved;try{saved=JSON.parse(body)}catch{return new Response(null,{status:400})}if(!Array.isArray(saved)||saved.length>100||saved.some(x=>typeof x!=='string'||x.length>100))return new Response(null,{status:400});await getDb().insert(profiles).values({user:u.userId,saved:JSON.stringify(saved)}).onConflictDoUpdate({target:profiles.user,set:{saved:JSON.stringify(saved)}});return Response.json({ok:true})}
