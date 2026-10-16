export async function readBody(r:Request,max:number){
 const reader=r.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let size=0;
 // Drain a small rejected body before replying, while bounding the drain budget.
 // This avoids cancelling a reusable local Worker connection for ordinary 413s.
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max+65536){await reader.cancel();throw Error('too-large')}if(size<=max)chunks.push(value)}}finally{reader.releaseLock()}
 if(size>max)throw Error('too-large');const output=new Uint8Array(size);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length}return output;
}
