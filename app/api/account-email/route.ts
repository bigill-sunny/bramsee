import {accountDb,currentUser,throttle} from '@/lib/auth';
import {digest,sameOrigin,hashPassword} from '@/lib/auth-crypto';
import {mailSettings,sendAccountLink} from '@/lib/account-mail';
import {readBody} from '@/lib/request-body';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
const reply=(body:any,status=200)=>Response.json(body,{status,headers});
export async function GET(){return reply({enabled:mailSettings().enabled})}
export async function POST(r:Request){
 let b:any;try{b=JSON.parse(new TextDecoder().decode(await readBody(r,4096)))}catch{return reply({error:'Invalid request.'},400)}
 if(!sameOrigin(r))return reply({error:'Request not allowed.'},403);
 try{
  const db=accountDb();
  if(b.action==='forgot'||b.action==='send-verification'){
   if(!mailSettings().enabled)return reply({error:'Email delivery is not enabled yet. Please contact the site owner.'},503);
   const user=b.action==='send-verification'?await currentUser(r):null;
   if(b.action==='send-verification'&&!user)return reply({error:'Sign in to verify your email.'},401);
   const email=user?.email||(typeof b.email==='string'?b.email.trim().toLowerCase():'');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return reply({error:'Enter a valid email address.'},400);
   if(!await throttle(r,'mail:'+email))return reply({error:'Too many requests. Try again in 15 minutes.'},429);
   const account=await db.prepare('SELECT id,email,email_verified FROM accounts WHERE email=?').bind(email).first<{id:string,email:string,email_verified:number}>();
   if(account&&(b.action==='forgot'||!account.email_verified)){try{await sendAccountLink(account,b.action==='forgot'?'reset':'verify')}catch{if(b.action!=='forgot')throw Error('Delivery unavailable')}}
   return reply({message:b.action==='forgot'?'If an account matches, a password-reset link has been requested. Check your inbox and spam folder.':'Verification email requested. Check your inbox and spam folder.'});
  }
  if(!['verify','reset'].includes(b.action)||typeof b.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.token))return reply({error:'This link is invalid.'},400);
  if(!await throttle(r,'token:'+digest(b.token)))return reply({error:'Too many attempts. Try again later.'},429);
  const hash=digest(b.token),now=Date.now();
  const token=await db.prepare('SELECT user_id FROM account_tokens WHERE token_hash=? AND purpose=? AND expires>?').bind(hash,b.action,now).first<{user_id:string}>();
  if(!token)return reply({error:'This link has expired or was already used. Request a new one.'},400);
  const valid='EXISTS(SELECT 1 FROM account_tokens WHERE token_hash=? AND user_id=accounts.id AND purpose=? AND expires>?)';
  if(b.action==='verify'){
   const result=await db.batch([db.prepare('UPDATE accounts SET email_verified=1 WHERE id=? AND '+valid).bind(token.user_id,hash,'verify',now),db.prepare('DELETE FROM account_tokens WHERE token_hash=?').bind(hash)]);
   if(!result[0].meta.changes)return reply({error:'This link has already been used.'},400);
   return reply({message:'Email verified. You can return to Bramsee.'});
  }
  if(typeof b.password!=='string'||b.password.length<15||b.password.length>128)return reply({error:'Use a password between 15 and 128 characters.'},400);
  const passwordHash=await hashPassword(b.password);
  const result=await db.batch([
   db.prepare('UPDATE accounts SET password_hash=? WHERE id=? AND '+valid).bind(passwordHash,token.user_id,hash,'reset',Date.now()),
   db.prepare("DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM account_tokens WHERE token_hash=? AND purpose='reset' AND expires>?)").bind(token.user_id,hash,Date.now()),
   db.prepare('DELETE FROM account_tokens WHERE token_hash=?').bind(hash)
  ]);
  if(!result[0].meta.changes)return reply({error:'This link has expired or was already used.'},400);
  return reply({message:'Password changed. All previous sessions have been signed out. Sign in with your new password.'});
 }catch{return reply({error:'The email service is unavailable. Please try again later.'},503)}
}
