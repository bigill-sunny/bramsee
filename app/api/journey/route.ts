import {readBody} from '@/lib/request-body';
import {accountDb,currentUser} from '@/lib/auth';
import {sameOrigin} from '@/lib/auth-crypto';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const coordinates=(b:any)=>typeof b.lat==='number'&&Number.isFinite(b.lat)&&Math.abs(b.lat)<=90&&typeof b.lon==='number'&&Number.isFinite(b.lon)&&Math.abs(b.lon)<=180;
export async function GET(r:Request){
 const id=new URL(r.url).searchParams.get('id');if(!validId(id))return reply({error:'Invalid journey link.'},400);
 try{const data=await accountDb().prepare('SELECT destination,lat,lon,updated,active FROM journeys WHERE id=?').bind(id).first();if(!data)return reply({error:'Journey not found.'},404);return reply(data.active?data:{active:0,updated:data.updated})}catch{return reply({error:'Journey unavailable. Please retry.'},503)}
}
export async function POST(r:Request){
 let b:any;try{b=JSON.parse(new TextDecoder().decode(await readBody(r,2048)))}catch{return reply({error:'Invalid sharing request.'},400)}
 if(!sameOrigin(r))return reply({error:'Request not allowed.'},403);
 if(!b||typeof b!=='object'||Array.isArray(b)||b.id!==undefined&&!validId(b.id)||b.active!==undefined&&typeof b.active!=='boolean')return reply({error:'Invalid sharing request.'},400);
 try{
  const user=await currentUser(r);if(!user)return reply({error:'Sign in again to update or stop sharing.'},401);
  const db=accountDb(),updated=Date.now();
  if(!b.id){if(!coordinates(b)||b.active===false)return reply({error:'A valid location is required to start sharing.'},400);const id=crypto.randomUUID();await db.prepare('INSERT INTO journeys(id,user,destination,lat,lon,updated,active) VALUES(?,?,?,?,?,?,1)').bind(id,user.userId,String(b.destination||'My journey').slice(0,200),b.lat,b.lon,updated).run();return reply({id,updated})}
  const owner=await db.prepare('SELECT active FROM journeys WHERE id=? AND user=?').bind(b.id,user.userId).first<{active:number}>();
  if(!owner)return reply({error:'This journey is unavailable for this account.'},404);
  if(b.active===false){await db.prepare('UPDATE journeys SET lat=NULL,lon=NULL,active=0,updated=? WHERE id=? AND user=?').bind(updated,b.id,user.userId).run();return reply({ok:true,updated})}
  if(!coordinates(b))return reply({error:'A valid location is required.'},400);
  if(!owner.active)return reply({error:'Sharing has ended. Start a new sharing session.'},409);
  const result=await db.prepare('UPDATE journeys SET lat=?,lon=?,updated=? WHERE id=? AND user=? AND active=1').bind(b.lat,b.lon,updated,b.id,user.userId).run();
  if(!result.meta.changes)return reply({error:'Sharing has ended. Start a new sharing session.'},409);
  return reply({ok:true,updated});
 }catch{return reply({error:'Sharing could not update. Please retry.'},503)}
}
