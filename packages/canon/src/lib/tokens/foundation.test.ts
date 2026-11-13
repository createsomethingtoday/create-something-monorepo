import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {colorVars} from './colors.js';
import {generateRadiusCSS} from './radius.js';
import {generateAnimationCSS} from './animation.js';
import {generateShadowsCSS} from './shadows.js';
import {typographyVars} from './typography.js';
const css=readFileSync(new URL('../styles/tokens.css',import.meta.url),'utf8');
const parse=(s:string)=>Object.fromEntries([...s.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(m=>[m[1],m[2].trim()]));
const root=parse(css.match(/:root\s*{([\s\S]*?)\n}/)![1]);
const scope=(selector:string)=>parse(css.slice(css.indexOf(selector)).match(/\{([\s\S]*?)\n}/)![1]);
function resolved(value:string,map:Record<string,string>,seen=new Set<string>()):string{return value.replace(/var\((--[\w-]+)\)/g,(_,key)=>{if(seen.has(key))throw Error(`Cyclic token ${key}`);return resolved(map[key]??key,map,new Set([...seen,key]));}).replace(/\s+/g,' ').trim();}
function luminance(hex:string){const a=hex.replace('#','').match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
describe('canonical approachable foundation',()=>{
 it('retains the black website foundation with an explicit light alternative',()=>{expect(root['--color-performance-bg-pure']).toBe('#000000');expect(scope("[data-theme='dark']")['--color-performance-bg-pure']).toBe('#000000');expect(scope("[data-theme='light']")['--color-performance-bg-pure']).toBe('#f7f8f6');});
 it('keeps public TS colors equivalent to canonical CSS including authority aliases',()=>{for(const [key,val] of Object.entries(colorVars))expect(resolved(val,root),key).toBe(resolved(root[key],root));});
 it('keeps every generated typography role aligned, including local font and prose rhythm',()=>{for(const [key,val] of Object.entries(typographyVars))expect(resolved(val,root).replaceAll('"',"'"),key).toBe(resolved(root[key],root).replaceAll('"',"'"));});
 for(const [mode,values] of Object.entries({default:root,light:scope("[data-theme='light']"),dark:scope("[data-theme='dark']")})){
 it(`${mode} has readable foreground/action/status pairs and no alias cycles`,()=>{const map={...root,...values};for(const key of Object.keys(map))resolved(map[key],map);for(const [fg,bg] of [['ink','panel'],['muted','paper'],['fg-secondary','bg-pure'],['success','success-muted'],['error','error-muted'],['warning','warning-muted'],['info','info-muted'],['growth','growth-soft'],['signal','signal-soft'],['risk','risk-soft'],['gold','gold-soft'],['pressure','pressure-soft']])expect(contrast(resolved(map['--color-performance-'+fg],map),resolved(map['--color-performance-'+bg],map)),`${mode}: ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);});
 }
 it('portable CSS and SCSS include the complete nested-theme contract',()=>{expect(readFileSync(new URL('../../../../canon-tokens/tokens.css',import.meta.url),'utf8')).toBe(css);expect(readFileSync(new URL('../../../../canon-tokens/tokens.scss',import.meta.url),'utf8')).toContain(css);});
});

it('portable JSON theme maps and compatibility aliases match the actual boundaries',()=>{
 for(const path of ['../styles/tokens.dtcg.json','../styles/tokens.figma.json','../styles/canon.json','../../../../canon-tokens/tokens.json']){
 const artifact=JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
 expect(artifact.foundationThemes.light).toEqual(scope("[data-theme='light']"));
 expect(artifact.foundationThemes.dark).toEqual(scope("[data-theme='dark']"));
 }
});

it('keeps geometry, response timing and elevation generators aligned with CSS',()=>{for(const generate of [generateRadiusCSS,generateAnimationCSS,generateShadowsCSS])for(const [key,val] of Object.entries(parse(generate())))expect(resolved(val,root),key).toBe(resolved(root[key],root));});
