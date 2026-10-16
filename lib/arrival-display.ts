export function arrivalDisplay(arrival:number,now:number,live:boolean){
 if(!live){const text=new Date(arrival*1000).toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit',timeZone:'America/Toronto'});return {text,unit:'',label:'Scheduled departure '+text+'. No live prediction.'}}
 const seconds=Math.max(0,Math.ceil(arrival-now/1000));
 if(seconds===0)return {text:'Due',unit:'',label:'Bus due. Live arrival estimate.'};
 if(seconds<600){const minutes=Math.floor(seconds/60),remaining=seconds%60;return {text:minutes+':'+String(remaining).padStart(2,'0'),unit:'min:sec',label:minutes+' minutes '+remaining+' seconds. Live arrival estimate.'}}
 const minutes=Math.ceil(seconds/60);return {text:String(minutes),unit:'min',label:minutes+' minutes. Live arrival estimate.'};
}
