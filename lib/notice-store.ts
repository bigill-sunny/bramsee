import {env} from 'cloudflare:workers';
import {accountDb} from './auth';
import {liveFeed} from './realtime';
import {goFeed} from './go-realtime';
import {normalizeNotice,type ServiceNotice} from './notices';
async function refreshAgency(agency:'Brampton Transit'|'GO Transit',configured:boolean,load:()=>Promise<any>){const db=accountDb(),now=Date.now();const lock=await db.prepare('INSERT INTO notice_sources(agency,attempt,status) VALUES(?,?,?) ON CONFLICT(agency) DO UPDATE SET attempt=excluded.attempt WHERE notice_sources.attempt<? RETURNING agency').bind(agency,now,configured?'pending':'not_configured',now-60000).first();if(!lock)return;
 if(!configured){await db.prepare('UPDATE notice_sources SET status=? WHERE agency=?').bind('not_configured',agency).run();return}
 try{const feed=await load();if(!feed.timestamp||Math.abs(now/1000-feed.timestamp)>120)throw Error('stale');const notices=(feed.items||[]).slice(0,200).map((item:any)=>normalizeNotice(agency,item,now)).filter(Boolean) as ServiceNotice[];if(notices.length)await db.batch(notices.map(n=>db.prepare('INSERT INTO service_notices(id,agency,title,description,url,detected,last_seen) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen').bind(n.id,n.agency,n.title,n.description,n.url,n.detected,n.last_seen)));await db.prepare('UPDATE notice_sources SET success=?,status=? WHERE agency=?').bind(now,'ok',agency).run()}catch{await db.prepare('UPDATE notice_sources SET status=? WHERE agency=?').bind('unavailable',agency).run()}}

export async function collectNotices(){const key=(env as unknown as {GO_API_KEY?:string}).GO_API_KEY;await Promise.all([refreshAgency('Brampton Transit',true,()=>liveFeed('alerts')),refreshAgency('GO Transit',!!key,()=>goFeed('alerts',key!))]);}
