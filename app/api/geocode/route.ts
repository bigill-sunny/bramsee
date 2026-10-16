import {env} from 'cloudflare:workers';
import {readBody} from '@/lib/request-body';
import {sameOrigin} from '@/lib/auth-crypto';
const headers={'Cache-Control':'private, no-store'};
let minute=0,count=0;
export async function POST(r:Request){
 let b:any;try{b=JSON.parse(new TextDecoder().decode(await readBody(r,1024)))}catch{return Response.json({error:'Invalid address search.'},{status:400,headers})}
 if(!sameOrigin(r))return Response.json({error:'Request not allowed.'},{status:403,headers});
 const q=typeof b.query==='string'?b.query.trim():'';
 if(q.length<3||q.length>200)return Response.json({error:'Enter an address between 3 and 200 characters.'},{status:400,headers});
 const key=(env as unknown as {ORS_API_KEY?:string}).ORS_API_KEY;
 if(!key)return Response.json({error:'Address search needs the walking-service key. You can still choose a stop or map pin.'},{status:503,headers});
 const bucket=Math.floor(Date.now()/60000);if(bucket!==minute){minute=bucket;count=0}if(++count>60)return Response.json({error:'Address search is busy. Try again shortly.'},{status:429,headers});
 try{const url=new URL('https://api.openrouteservice.org/geocode/search');url.search=new URLSearchParams({text:q,'boundary.country':'CAN','boundary.rect.min_lon':'-82','boundary.rect.max_lon':'-76','boundary.rect.min_lat':'42','boundary.rect.max_lat':'46','focus.point.lat':'43.7315','focus.point.lon':'-79.7624',size:'5'}).toString();const res=await fetch(url,{headers:{Authorization:key.trim()},signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error();const data:any=await res.json();const places=(data.features||[]).flatMap((f:any)=>{const [lon,lat]=f.geometry?.coordinates||[];return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=42&&lat<=46&&lon>=-82&&lon<=-76&&typeof f.properties?.label==='string'?[{name:f.properties.label.slice(0,200),lat,lon,detail:['address','venue'].includes(f.properties.layer)?'Address / place · confirm the map pin':'Street or area match · confirm the map pin'}]:[]}).slice(0,5);return Response.json({places},{headers})}catch{return Response.json({error:'Address search is unavailable. Check Geocoding access on your walking key, or choose a stop or map pin.'},{status:503,headers})}
}
