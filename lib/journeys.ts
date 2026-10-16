import type {Point,Option,Leg} from './planner';
import type {WalkRoute} from './walking';
export type SavedJourney={id:string,name:string,from:Point,to:Point};
export function parseJourneys(raw:string):SavedJourney[]{
 try{const data=JSON.parse(raw);if(!Array.isArray(data))return [];const point=(p:any)=>p&&typeof p.name==='string'&&p.name.length<=200&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;return data.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.trim()&&x.name.length<=60&&point(x.from)&&point(x.to)).slice(0,50)}catch{return []}
}
export function routeNumber(leg:Leg){return leg.trip.number||leg.trip.route.replace(/^GO:/,'GO ')}
export function direction(leg:Leg){const explicit=leg.trip.headsign.match(/\b(north|south|east|west)(?:bound)?\b/i);if(explicit)return explicit[1][0].toUpperCase()+explicit[1].slice(1).toLowerCase()+'bound';return 'Toward '+leg.trip.headsign}
export type RankedJourney={id:string,arrival:number,option:Option|null};
export function applyWalkingTimes(option:Option,routes:WalkRoute[],now:number):Option{if(routes.length!==option.legs.length+1||routes.some(r=>!Number.isFinite(r.duration)||r.duration<0))return option;const arrival=option.legs.at(-1)!.arrival+routes.at(-1)!.duration;return {...option,arrival,duration:(arrival-now/1000)/60,walk:routes.reduce((sum,r)=>sum+r.duration,0)/60}}
export function rankJourneys(options:Option[],walk:WalkRoute|null,now:number,estimate:number):RankedJourney[]{return [...options.map(option=>({id:option.id,arrival:option.arrival,option})),{id:'walking',arrival:now/1000+(walk?.duration??estimate),option:null}].sort((a,b)=>a.arrival-b.arrival||a.id.localeCompare(b.id))}
