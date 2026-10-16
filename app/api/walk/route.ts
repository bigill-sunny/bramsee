import {env} from 'cloudflare:workers';
import {createWalkingService,WalkingError} from '@/lib/walking';
const walking=createWalkingService();
export async function GET(){return Response.json({configured:!!(env as unknown as {ORS_API_KEY?:string}).ORS_API_KEY},{headers:{'Cache-Control':'private, no-store'}})}
export async function POST(r:Request){
 const headers={'Cache-Control':'private, no-store'};
 if(r.headers.get('origin')!==new URL(r.url).origin)return Response.json({error:'Request must come from Bramsee.'},{status:403,headers});
 const text=await r.text();if(text.length>2048)return Response.json({error:'Walking request too large.'},{status:413,headers});
 let body;try{body=JSON.parse(text)}catch{return Response.json({error:'Invalid walking request.'},{status:400,headers})}
 try{return Response.json(await walking(body,(env as unknown as {ORS_API_KEY?:string}).ORS_API_KEY||''),{headers})}catch(e){return Response.json({error:e instanceof WalkingError?e.message:'Walking directions are unavailable.'},{status:e instanceof WalkingError?e.status:503,headers})}
}
