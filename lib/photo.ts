export function photoType(bytes:Uint8Array){
 if(bytes.length<24||bytes.length>256*1024)throw Error('Choose an image under 256 KB.');
 const check=(w:number,h:number)=>{if(w<16||h<16||w>512||h>512)throw Error('Use an image from 16 to 512 pixels per side.')};
 const signature=[137,80,78,71,13,10,26,10];
 if(signature.every((n,i)=>bytes[i]===n)&&String.fromCharCode(...bytes.slice(12,16))==='IHDR'){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);check(view.getUint32(16),view.getUint32(20));if(String.fromCharCode(...bytes.slice(-8,-4))!=='IEND')throw Error('Invalid image.');return 'image/png'}
 if(bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){let pos=2;while(pos+4<bytes.length){if(bytes[pos++]!==255)throw Error('Invalid image.');while(bytes[pos]===255)pos++;const marker=bytes[pos++];if(marker===0xda||marker===0xd9)break;const length=bytes[pos]*256+bytes[pos+1];if(length<2||pos+length>bytes.length)break;if([0xc0,0xc1,0xc2].includes(marker)&&length>=8){check(bytes[pos+5]*256+bytes[pos+6],bytes[pos+3]*256+bytes[pos+4]);return 'image/jpeg'}pos+=length}}
 throw Error('Choose a JPEG or PNG profile photo.');
}
