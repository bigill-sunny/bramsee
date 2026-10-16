import {accountDb,currentUser,issueSession,publicUser,throttle} from '@/lib/auth';
import {credentials,digest,hashPassword,sameOrigin,sessionCookie,sessionToken,verifyPassword} from '@/lib/auth-crypto';
import {readBody} from '@/lib/request-body';
const reply=(body:any,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
// A valid fixed-cost dummy hash avoids a fast path for unknown accounts.
const dummy='scrypt$32768$8$3$00000000000000000000000000000000$'+'00'.repeat(32);
export async function POST(r:Request){let raw:string;try{raw=new TextDecoder().decode(await readBody(r,4096))}catch{return reply({error:'Request too large.'},413)}if(!sameOrigin(r))return reply({error:'Request not allowed.'},403);let b:any;try{b=JSON.parse(raw)}catch{return reply({error:'Invalid request.'},400)}
 try{
  if(b.action==='logout'){const token=sessionToken(r);if(token)await accountDb().prepare('DELETE FROM sessions WHERE token_hash=?').bind(digest(token)).run();return reply({ok:true},200,sessionCookie(r,'',0))}
  if(!['register','login'].includes(b.action))return reply({error:'Unknown action.'},400);
  let c;try{c=credentials(b,b.action==='register')}catch(e){return reply({error:(e as Error).message},400)}
  if(!await throttle(r,c.email))return reply({error:'Too many attempts. Try again in 15 minutes.'},429);
  let userId:string;
  if(b.action==='register'){
   const hash=await hashPassword(c.password);userId=crypto.randomUUID();
   try{await accountDb().prepare('INSERT INTO accounts(id,email,name,password_hash,created) VALUES(?,?,?,?,?)').bind(userId,c.email,c.name,hash,Date.now()).run()}catch{return reply({error:'Could not create an account with these details. Try signing in instead.'},400)}
  }else{const account=await accountDb().prepare('SELECT id,password_hash FROM accounts WHERE email=?').bind(c.email).first<{id:string,password_hash:string}>();const valid=await verifyPassword(c.password,account?.password_hash||dummy);if(!account||!valid)return reply({error:'Email or password is incorrect.'},401);userId=account.id}
  const cookie=await issueSession(r,userId);const user=await currentUser(new Request(r.url,{headers:{cookie:cookie.split(';')[0]}}));return reply(user?publicUser(user):null,200,cookie);
 }catch{return reply({error:'Account service is unavailable. Please try again.'},503)}
}
