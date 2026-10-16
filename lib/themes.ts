export const themes=[
 {id:'bright',name:'Bright',dark:false,bg:'#fafbf5',surface:'#ffffff',soft:'#edf2e6',ink:'#203e35',muted:'#566252',accent:'#1c5144',onAccent:'#ffffff',line:'#cbd4c5',success:'#25603b'},
 {id:'dark',name:'Dark',dark:true,bg:'#111a20',surface:'#1c2931',soft:'#263a45',ink:'#f0f6fa',muted:'#b2c5d0',accent:'#8ddac8',onAccent:'#102b24',line:'#526571',success:'#98e3b4'},
 {id:'pink',name:'Pink cutesy',dark:false,bg:'#fff3f8',surface:'#ffffff',soft:'#fbe0ec',ink:'#53243b',muted:'#795266',accent:'#a32e66',onAccent:'#ffffff',line:'#e0b6cb',success:'#25603b'},
 {id:'metal',name:'Metal',dark:true,bg:'#17191d',surface:'#24272d',soft:'#333943',ink:'#f1f3f6',muted:'#bdc5d0',accent:'#c6d2e5',onAccent:'#19212d',line:'#5a6473',success:'#98e3b4'},
 {id:'sporty',name:'Sporty',dark:true,bg:'#151c13',surface:'#222d1e',soft:'#33422b',ink:'#f4f8ed',muted:'#c0cdb3',accent:'#b7ed3b',onAccent:'#1c2b06',line:'#586b44',success:'#a7e6ae'},
 {id:'cool',name:'Cool',dark:false,bg:'#eff7fc',surface:'#ffffff',soft:'#deedf7',ink:'#19364d',muted:'#47677e',accent:'#175c87',onAccent:'#ffffff',line:'#b6cedf',success:'#25603b'},
 {id:'warm',name:'Warm',dark:false,bg:'#fff6ea',surface:'#fffdfa',soft:'#f9e5d0',ink:'#503323',muted:'#775844',accent:'#9b431f',onAccent:'#ffffff',line:'#d9baa0',success:'#25603b'},
] as const;
export type ThemeId=typeof themes[number]['id'];
export const themeStorageKey='bramsee-theme';
export function findTheme(value:unknown){return themes.find(t=>t.id===value)||themes[0]}
export function themeProperties(value:unknown){const t=findTheme(value);return {'--cream':t.bg,'--surface':t.surface,'--soft':t.soft,'--ink':t.ink,'--muted':t.muted,'--green':t.accent,'--on-accent':t.onAccent,'--line':t.line,'--lime':t.onAccent,'--success':t.success}}
