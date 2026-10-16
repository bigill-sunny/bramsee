export type MailEnvironment={EMAIL_PROVIDER?:string,BREVO_API_KEY?:string,RESEND_API_KEY?:string,EMAIL_FROM?:string,APP_ORIGIN?:string};
export function emailSettings(e:MailEnvironment){
 const provider=e.EMAIL_PROVIDER?.trim().toLowerCase()||(e.BREVO_API_KEY&&!e.RESEND_API_KEY?'brevo':'resend');
 const key=(provider==='brevo'?e.BREVO_API_KEY:provider==='resend'?e.RESEND_API_KEY:'')?.trim()||'';
 const from=e.EMAIL_FROM?.trim()||'';
 const match=from.match(/^(?:([^<>\r\n]+)\s*<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>|([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+))$/);
 const sender=match&&!/[\r\n]/.test(from)&&from.length<=320?{name:match[1]?.trim()||'Bramsee',email:match[2]||match[3]}:null;
 let origin='';try{const u=new URL(e.APP_ORIGIN||'');if(u.protocol==='https:'&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash)origin=u.origin}catch{}
 return {provider,key,from,sender,origin,enabled:!!(key&&sender&&origin)};
}
export type MailContent={to:string,subject:string,text:string,id:string};
export async function deliverEmail(settings:ReturnType<typeof emailSettings>,mail:MailContent,fetcher:typeof fetch=fetch){
 if(!settings.enabled||!settings.sender)throw Error('Email delivery is not configured.');
 const brevo=settings.provider==='brevo';
 const r=await fetcher(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{
  method:'POST',
  headers:brevo?{'api-key':settings.key,'Content-Type':'application/json',Accept:'application/json'}:{Authorization:'Bearer '+settings.key,'Content-Type':'application/json','Idempotency-Key':mail.id},
  body:JSON.stringify(brevo?{sender:settings.sender,to:[{email:mail.to}],subject:mail.subject,textContent:mail.text}:{from:settings.from,to:[mail.to],subject:mail.subject,text:mail.text}),
  signal:AbortSignal.timeout(12000)
 });
 if(!r.ok)throw Error('Email could not be sent. Please try again later.');
}
