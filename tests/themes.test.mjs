import assert from 'node:assert/strict';
import {themes,findTheme} from '../lib/themes.ts';
const luminance=hex=>{const channels=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const t of themes)for(const [foreground,background] of [[t.ink,t.bg],[t.ink,t.surface],[t.muted,t.bg],[t.muted,t.surface],[t.ink,t.soft],[t.accent,t.bg],[t.onAccent,t.accent],[t.success,t.surface]])assert.ok(contrast(foreground,background)>=4.5,t.name+' text contrast '+foreground+' on '+background);
assert.equal(new Set(themes.map(t=>t.id)).size,7);
assert.equal(findTheme('untrusted-theme').id,'bright');
console.log('Seven theme palettes passed normal-text contrast checks for primary, muted, accent, button and status text.');
