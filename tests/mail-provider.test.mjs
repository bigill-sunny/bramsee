import assert from 'node:assert/strict';
import {emailSettings,deliverEmail} from '../lib/mail-provider.ts';
const common={EMAIL_FROM:'Bramsee <verified@example.com>',APP_ORIGIN:'https://bramsee.bigill.workers.dev'};
const brevo=emailSettings({...common,EMAIL_PROVIDER:'brevo',BREVO_API_KEY:'fake-test-key'});
assert.equal(brevo.enabled,true);assert.deepEqual(brevo.sender,{name:'Bramsee',email:'verified@example.com'});
assert.equal(emailSettings({...common,BREVO_API_KEY:'fake-test-key'}).provider,'brevo');
assert.equal(emailSettings({...common,EMAIL_PROVIDER:'unknown',BREVO_API_KEY:'fake-test-key'}).enabled,false);
for(const EMAIL_FROM of ['','not-an-email','User\r\nBcc: x@example.com','<a@example.com','a@example.com>']){
 // Malformed brackets and header injections must never enable delivery.
 assert.equal(emailSettings({...common,EMAIL_FROM,BREVO_API_KEY:'fake-test-key'}).enabled,false);
}
for(const APP_ORIGIN of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com/?token=x'])assert.equal(emailSettings({...common,APP_ORIGIN,BREVO_API_KEY:'fake-test-key'}).enabled,false);
const mail={id:'test-id',to:'recipient@example.com',subject:'Verify email',text:'Test-only verification link'};
let captured;
const mock=async(url,options)=>{captured={url,options};return new Response('{}',{status:201})};
await deliverEmail(brevo,mail,mock);assert.equal(captured.url,'https://api.brevo.com/v3/smtp/email');assert.equal(captured.options.headers['api-key'],'fake-test-key');assert.equal(captured.options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(captured.options.body),{sender:brevo.sender,to:[{email:mail.to}],subject:mail.subject,textContent:mail.text});
const resend=emailSettings({...common,RESEND_API_KEY:'fake-resend-key'});await deliverEmail(resend,mail,mock);assert.equal(captured.url,'https://api.resend.com/emails');assert.equal(captured.options.headers.Authorization,'Bearer fake-resend-key');assert.equal(captured.options.headers['Idempotency-Key'],'test-id');assert.equal(JSON.parse(captured.options.body).text,mail.text);
await assert.rejects(deliverEmail(brevo,mail,async()=>new Response('private upstream error',{status:401})),/Email could not be sent/);
await assert.rejects(deliverEmail(emailSettings({}),mail,mock),/not configured/);
console.log('Mail provider tests passed: Brevo/Resend payloads, private authentication headers, configuration validation and sanitized failures. No emails sent.');
