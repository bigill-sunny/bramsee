// Interpret the picker in Brampton time, even when the device is abroad.
export function departureTime(value:string):number {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return NaN;
 const target=Date.parse(value+'Z');let at=target;
 for(let i=0;i<4;i++){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(x=>[x.type,x.value]));const rendered=`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;if(rendered===value)return at;at+=target-Date.parse(rendered+'Z')}
 return NaN;
}
