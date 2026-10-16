export type Stop={id:string,code:string,name:string,lat:number,lon:number};
export type Trip={id:string,route:string,headsign:string,service:string,serviceDate?:string,serviceMidnight?:number,agency?:string,mode?:'bus'|'train',number?:string,stops:[string,number,number,number,number,number?][]};
export type Catalog={stops:Stop[],routes:Record<string,{id:string,name:string,number:string}>,calendar:Record<string,string[]>,validUntil:string,coverage?:Record<string,{from:string,until:string,source:string}>,goCoverage?:{from:string,until:string},feedHashes?:Record<string,string>};
export type Point={name:string,lat:number,lon:number};
export type Leg={trip:Trip,from:Stop,to:Stop,departure:number,arrival:number,live:boolean};
export type Transfer={from:Stop,to:Stop,minutes:number};
export type Option={id:string,legs:Leg[],walk:number,duration:number,arrival:number,transfer?:Transfer};
export function distance(a:{lat:number,lon:number},b:{lat:number,lon:number}){const rad=Math.PI/180;const h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lon-a.lon)*rad/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
export function localClock(now=Date.now()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const seconds=Number(p.hour)*3600+Number(p.minute)*60+Number(p.second);return {date:p.year+p.month+p.day,seconds,midnight:Math.floor(now/1000)-seconds}}

// GTFS times are elapsed from local noon minus twelve hours, including on DST days.
export function serviceDays(now=Date.now()){
 const date=localClock(now).date,day=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8));
 return [-2,-1,0,1].map(offset=>{
  const d=new Date(day+offset*86400000),key=d.toISOString().slice(0,10).replaceAll('-','');
  let noon=d.getTime()+12*3600000;
  for(let i=0;i<3;i++){const c=localClock(noon);const actual=Date.UTC(+c.date.slice(0,4),+c.date.slice(4,6)-1,+c.date.slice(6,8))+c.seconds*1000;noon+=d.getTime()+12*3600000-actual}
  return {date:key,midnight:noon/1000-43200};
 });
}
export async function loadServiceTrips(c:Catalog,load:(service:string)=>Promise<Trip[]>,now=Date.now()){
 const days=serviceDays(now),services=[...new Set(days.flatMap(d=>c.calendar[d.date]||[]))];
 const data=new Map(await Promise.all(services.map(async id=>[id,await load(id)] as const)));
 return days.flatMap(d=>(c.calendar[d.date]||[]).flatMap(id=>(data.get(id)||[]).filter(t=>t.stops.length&&d.midnight+t.stops.at(-1)![1]>=now/1000-7200&&d.midnight+t.stops[0][1]<now/1000+21600).map(t=>({...t,serviceDate:d.date,serviceMidnight:d.midnight}))));
}

function times(trips:Trip[],feed:any,now:number){
 const clock=localClock(now*1000),fresh=!!feed&&now-feed.timestamp>=-30&&now-feed.timestamp<120;
 const origin=(t:Trip)=>t.serviceMidnight??clock.midnight;
 const dated=new Map<string,any>(),undated=new Map<string,any>();
 for(const u of feed?.items||[])if(u.date)dated.set(u.trip+':'+u.date,u);else undated.set(u.trip,u);
 // An undated prediction belongs to one trip instance, never to every day's copy.
 const closest=new Map<string,{trip:Trip,score:number}>();
 for(const t of trips){const u=undated.get(t.id);if(!u)continue;let score=Infinity;
  for(const r of u.stops||[]){const s=t.stops.find(s=>(r.id?s[0]===r.id:true)&&(!r.sequence||s[2]===r.sequence));if(s&&(r.departure||r.arrival))score=Math.min(score,Math.abs((r.departure||r.arrival)-origin(t)-s[1]))}
  if(!Number.isFinite(score)){const a=origin(t)+(t.stops[0]?.[1]||0),b=origin(t)+(t.stops.at(-1)?.[1]||0);score=now<a?a-now:now>b?now-b:0}
  if(score<(closest.get(t.id)?.score??Infinity))closest.set(t.id,{trip:t,score});
 }
 const cache=new Map<Trip,Map<number,{time:number,live:boolean}|null>>();
 const calculate=(t:Trip,index:number,boarding=true)=>{
  const s=t.stops[index];if(!s)return null;
  const u=dated.get(t.id+':'+(t.serviceDate||clock.date))||(closest.get(t.id)?.trip===t?undated.get(t.id):undefined);
  const usable=fresh&&u&&(!u.timestamp||(now-u.timestamp>=-30&&now-u.timestamp<120));
  if(usable&&u.relationship===3)return null;
  const rt=usable?u.stops?.find((r:any)=>(r.id?r.id===s[0]:true)&&(!r.sequence||r.sequence===s[2])):undefined;
  if(rt?.relationship===1)return null;
  const prediction=boarding?(rt?.departure||rt?.arrival):(rt?.arrival||rt?.departure);
  if(prediction&&rt.relationship!==2)return {time:prediction,live:true};
  // Carry a preceding delay downstream unless NO_DATA explicitly ends it.
  let delay:number|undefined;
  if(usable)for(let i=0;i<=index;i++){
   const r=u.stops?.find((r:any)=>(r.id?r.id===t.stops[i][0]:true)&&(!r.sequence||r.sequence===t.stops[i][2]));
   if(r?.relationship===2){delay=undefined;continue}
   const absolute=r?.departure||r?.arrival;
   if(absolute)delay=absolute-origin(t)-(r?.departure?t.stops[i][1]:(t.stops[i][5]??t.stops[i][1]));else if(r?.delay!==undefined)delay=r.delay;
  }
  return {time:origin(t)+(boarding?s[1]:(s[5]??s[1]))+(delay??0),live:delay!==undefined};
 };
 return (t:Trip,index:number,boarding=true)=>{let entries=cache.get(t);if(!entries){entries=new Map();cache.set(t,entries)}const key=index*2+(boarding?1:0);if(entries.has(key))return entries.get(key)!;const result=calculate(t,index,boarding);entries.set(key,result);return result};
}
export function arrivals(stop:Stop,trips:Trip[],feed:any,now=Date.now()){
 const value=times(trips,feed,now/1000);
 return trips.flatMap(t=>t.stops.flatMap((s,i)=>{
  if(s[0]!==stop.id||s[3]===1)return [];const v=value(t,i);
  return v&&v.time>=now/1000&&v.time<now/1000+7200?[{trip:t,...v}]:[];
 })).sort((a,b)=>a.time-b.time).slice(0,12);
}
export function plan(from:Point,to:Point,c:Catalog,trips:Trip[],feed:any,maxWalk=1000,at=Date.now()):Option[]{
 const now=at/1000,byId=new Map(c.stops.map(s=>[s.id,s])),value=times(trips,feed,now);
 const near=(p:Point)=>new Map(c.stops.map(s=>[s.id,distance(s,p)*1.35/1.25] as const).filter(([,seconds])=>seconds*1.25<=maxWalk));
 const starts=near(from),ends=near(to),options:Option[]=[];
 const leg=(t:Trip,a:number,b:number):Leg|null=>{const v=value(t,a),w=value(t,b,false),s=byId.get(t.stops[a][0]),e=byId.get(t.stops[b][0]);return v&&w&&s&&e&&w.time>=v.time?{trip:t,from:s,to:e,departure:v.time,arrival:w.time,live:v.live&&w.live}:null};
 const inbound=new Map<string,{leg:Leg,walk:number}[]>();
 for(const t of trips)for(let b=1;b<t.stops.length;b++){
  const walk=ends.get(t.stops[b][0]);if(walk===undefined||t.stops[b][4]===1)continue;
  for(let a=0;a<b;a++){if(t.stops[a][3]===1)continue;const l=leg(t,a,b);if(!l||l.departure<now||l.departure>now+10800)continue;const list=inbound.get(l.from.id)||[];list.push({leg:l,walk});inbound.set(l.from.id,list)}
 }
 for(const list of inbound.values())list.sort((a,b)=>a.leg.departure-b.leg.departure);
 const connections=new Map<string,{stop:Stop,seconds:number}[]>();
 const transfers=(stop:Stop)=>{let result=connections.get(stop.id);if(result)return result;result=c.stops.filter(s=>inbound.has(s.id)&&Math.abs(s.lat-stop.lat)<.005).map(s=>({stop:s,seconds:distance(stop,s)*1.35/1.25})).filter(x=>x.seconds*1.25<=Math.min(maxWalk,400));connections.set(stop.id,result);return result};
 const add=(legs:Leg[],walk:number,transfer?:Transfer)=>{const arrival=legs.at(-1)!.arrival+ends.get(legs.at(-1)!.to.id)!;options.push({id:legs.map(l=>[l.trip.id,l.trip.serviceDate,l.from.id,l.to.id].join(':')).join('-'),legs,walk:walk/60,duration:(arrival-now)/60,arrival,transfer})};
 for(const t of trips)for(let a=0;a<t.stops.length;a++){
  const walk=starts.get(t.stops[a][0]);if(walk===undefined||t.stops[a][3]===1)continue;
  const v=value(t,a);if(!v||v.time<now+walk+90||v.time>now+5400)continue;
  for(let b=a+1;b<t.stops.length;b++){
   if(t.stops[b][4]===1)continue;const l=leg(t,a,b);if(!l)continue;
   const finalWalk=ends.get(l.to.id);if(finalWalk!==undefined)add([l],walk+finalWalk);
   for(const transfer of transfers(l.to)){
    const list=inbound.get(transfer.stop.id)||[],earliest=l.arrival+transfer.seconds+180;
    let low=0,high=list.length;while(low<high){const mid=(low+high)>>>1;if(list[mid].leg.departure<earliest)low=mid+1;else high=mid}
    for(let i=low;i<list.length&&list[i].leg.departure<=earliest+3600;i++){
     const next=list[i];if(next.leg.trip===t||next.leg.trip.route===t.route)continue;
     add([l,next.leg],walk+transfer.seconds+next.walk,transfer.stop.id===l.to.id?undefined:{from:l.to,to:transfer.stop,minutes:transfer.seconds/60});
    }
   }
  }
 }
 const seen=new Set<string>();return options.sort((a,b)=>a.arrival-b.arrival||a.legs.length-b.legs.length||a.walk-b.walk).filter(o=>{const key=o.legs.map(l=>l.trip.route+':'+l.trip.headsign).join('-');if(seen.has(key))return false;seen.add(key);return true}).slice(0,8);
}
