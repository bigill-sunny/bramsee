'use client';
import {useEffect,useState} from 'react';
import {themes,findTheme,themeProperties,themeStorageKey,type ThemeId} from '@/lib/themes';
function apply(value:unknown){const theme=findTheme(value);document.documentElement.dataset.theme=theme.id;document.documentElement.style.colorScheme=theme.dark?'dark':'light';for(const [key,color] of Object.entries(themeProperties(theme.id)))document.documentElement.style.setProperty(key,color);return theme.id}
export function useAppearance(){
 const [theme,setTheme]=useState<ThemeId>('bright'),[storageMessage,setStorageMessage]=useState('Saved on this device.');
 useEffect(()=>{try{setTheme(apply(localStorage.getItem(themeStorageKey)))}catch{apply('bright');setStorageMessage('Your browser cannot save appearance preferences.')}},[]);
 function choose(value:ThemeId){setTheme(apply(value));try{localStorage.setItem(themeStorageKey,value);setStorageMessage('Saved on this device.')}catch{setStorageMessage('Theme applied for this visit. Your browser could not save it.')}}
 return {theme,choose,storageMessage};
}
export default function Appearance({theme,onChange,message}:{theme:ThemeId,onChange:(id:ThemeId)=>void,message:string}){
 return <section className="profile-section" aria-labelledby="appearance-title"><h3 id="appearance-title">Appearance</h3><p className="caption">Choose your Bramsee colours.</p><div className="theme-grid" role="group" aria-label="Colour theme">{themes.map(t=><button key={t.id} type="button" className="theme-choice" aria-pressed={theme===t.id} onClick={()=>onChange(t.id)}><span className="theme-swatch" aria-hidden="true" style={{background:t.bg,borderColor:t.line}}><i style={{background:t.accent}}/><i style={{background:t.ink}}/><i style={{background:t.soft}}/></span><span>{t.name}</span><span aria-hidden="true">{theme===t.id?'✓':''}</span></button>)}</div><p className="caption" role="status">{message}</p></section>;
}
