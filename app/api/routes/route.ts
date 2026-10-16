import {accountDb,currentUser} from '@/lib/auth';
import {sameOrigin} from '@/lib/auth-crypto';
import {parseJourneys} from '@/lib/journeys';
import {readBody} from '@/lib/request-body';
const headers={'Cache-Control':'private, no-store'};
export async function GET(r:Request){const u=await currentUser(r);if(!u)return new Response(null,{status:401,headers});const row=await accountDb().prepare('SELECT routes FROM saved_routes WHERE user_id=?').bind(u.userId).first<{routes:string}>();return Response.json(JSON.parse(row?.routes||'[]'),{headers})}
export async function POST(r:Request){let raw:string;try{raw=new TextDecoder().decode(await readBody(r,40000))}catch{return new Response(null,{status:413,headers})}if(!sameOrigin(r))return new Response(null,{status:403,headers});const u=await currentUser(r);if(!u)return new Response(null,{status:401,headers});if(r.headers.get('X-Bramsee-Account')!==u.userId)return new Response(null,{status:409,headers});let data;try{data=JSON.parse(raw);if(!Array.isArray(data)||data.length>50||parseJourneys(raw).length!==data.length)throw Error()}catch{return new Response(null,{status:400,headers})}await accountDb().prepare('INSERT INTO saved_routes(user_id,routes) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET routes=excluded.routes').bind(u.userId,JSON.stringify(parseJourneys(raw))).run();return Response.json({ok:true},{headers})}
