import {env} from 'cloudflare:workers';
import {accountDb} from './auth';
import {digest,newToken} from './auth-crypto';
export function mailSettings(){const e=env as unknown as {RESEND_API_KEY?:string,EMAIL_FROM?:string,APP_ORIGIN?:string};let origin='';try{const u=new URL(e.APP_ORIGIN||'');if(u.protocol==='https:'&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash)origin=u.origin}catch{}return {key:e.RESEND_API_KEY||'',from:e.EMAIL_FROM||'',origin,enabled:!!(e.RESEND_API_KEY&&e.EMAIL_FROM&&origin)}}
export async function sendAccountLink(user:{id:string,email:string},purpose:'verify'|'reset'){
 const settings=mailSettings();if(!settings.enabled)throw Error('Email delivery is not configured.');
 const token=newToken(),hash=digest(token),db=accountDb(),expires=Date.now()+(purpose==='reset'?30*60000:24*3600000);
 await db.batch([db.prepare('DELETE FROM account_tokens WHERE user_id=? AND purpose=?').bind(user.id,purpose),db.prepare('DELETE FROM account_tokens WHERE expires<?').bind(Date.now()),db.prepare('INSERT INTO account_tokens(token_hash,user_id,purpose,expires) VALUES(?,?,?,?)').bind(hash,user.id,purpose,expires)]);
 const link=settings.origin+'/account-action#'+new URLSearchParams({purpose,token});
 try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+settings.key,'Content-Type':'application/json','Idempotency-Key':hash},body:JSON.stringify({from:settings.from,to:[user.email],subject:purpose==='verify'?'Verify your Bramsee email':'Reset your Bramsee password',text:(purpose==='verify'?'Confirm your email address':'Choose a new password')+' by opening this link:\n\n'+link+'\n\nThis link expires in '+(purpose==='reset'?'30 minutes':'24 hours')+'. If you did not request this, ignore this email.'}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error()}catch{await db.prepare('DELETE FROM account_tokens WHERE token_hash=?').bind(hash).run();throw Error('Email could not be sent. Please try again later.')}
}
