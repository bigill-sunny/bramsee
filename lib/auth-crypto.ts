import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
const options={N:32768,r:8,p:3,maxmem:64*1024*1024};
function derive(password:string,salt:Buffer):Promise<Buffer>{return new Promise((resolve,reject)=>scrypt(password,salt,32,options,(error,key)=>error?reject(error):resolve(key)))}
export async function hashPassword(password:string){const salt=randomBytes(16);return 'scrypt$32768$8$3$'+salt.toString('hex')+'$'+(await derive(password,salt)).toString('hex')}
export async function verifyPassword(password:string,stored:string){const parts=stored.split('$');if(parts.length!==6||parts.slice(0,4).join('$')!=='scrypt$32768$8$3'||!/^[a-f0-9]{32}$/.test(parts[4])||!/^[a-f0-9]{64}$/.test(parts[5]))return false;return timingSafeEqual(await derive(password,Buffer.from(parts[4],'hex')),Buffer.from(parts[5],'hex'))}
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');
export function credentials(body:any,register=false){const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';const password=typeof body.password==='string'?body.password:'';const name=typeof body.name==='string'?body.name.trim():'';if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||password.length>(128)||password.length<(register?15:1)||register&&(!name||name.length>60))throw Error(register?'Use a name, valid email and a password of 15–128 characters.':'Enter your email and password.');return {email,password,name}}
export function cookieName(request:Request){return new URL(request.url).protocol==='https:'?'__Host-bramsee_session':'bramsee_session'}
export function sessionCookie(request:Request,token:string,maxAge=30*86400){return cookieName(request)+'='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+maxAge+(new URL(request.url).protocol==='https:'?'; Secure':'')}
export function sessionToken(request:Request){const name=cookieName(request);const match=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);return match&&/^[A-Za-z0-9_-]{43}$/.test(match)?match:null}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin}
