'use client';
import {useRef} from 'react';
export type SheetMode='collapsed'|'half'|'expanded';
const modes:SheetMode[]=['collapsed','half','expanded'];
export default function SheetHandle({mode,onChange,label}:{mode:SheetMode,onChange:(mode:SheetMode)=>void,label:string}){
 const start=useRef<number|null>(null),dragged=useRef(false);
 const move=(direction:number)=>onChange(modes[Math.max(0,Math.min(2,modes.indexOf(mode)+direction))]);
 return <div className="sheet-handle"><button type="button" aria-label="Resize trip panel" aria-controls="trip-panel-content" aria-expanded={mode!=='collapsed'} onClick={()=>{if(dragged.current){dragged.current=false;return}onChange(mode==='expanded'?'half':'expanded')}} onKeyDown={e=>{if(e.key==='ArrowUp'){e.preventDefault();move(1)}else if(e.key==='ArrowDown'){e.preventDefault();move(-1)}else if(e.key==='Home'){e.preventDefault();onChange('collapsed')}else if(e.key==='End'){e.preventDefault();onChange('expanded')}}} onPointerDown={e=>{start.current=e.clientY;dragged.current=false;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerUp={e=>{if(start.current!==null){const delta=start.current-e.clientY;if(Math.abs(delta)>35){dragged.current=true;move(delta>0?1:-1)}}start.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{start.current=null;dragged.current=false}}><span className="sheet-grip" aria-hidden="true"/><span>{label}</span><small>{mode==='expanded'?'Tap to show map':'Tap or drag to expand'}</small></button></div>;
}
