import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const context=vm.createContext({});
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
context.esc=esc;context.HEADING_RE=/^(#{1,6})\s+(.+)$/;context.slugify=s=>s.toLowerCase();
vm.runInContext(source.slice(source.indexOf('const BLOCK_TAGS'),source.indexOf('// ──',source.indexOf('function renderMdx')))+';globalThis.render=renderMdx;',context);
test('render recognized tags without attacker event attributes',()=>{
 const html=context.render('<strong onclick="alert(1)">hello</strong> <kbd onmouseover="alert(2)">key</kbd>');
 assert.doesNotMatch(html,/<[^>]*\son\w+\s*=/i);assert.match(html,/<strong>hello<\/strong>/);
});
for(const url of ['javascript:alert(1)','JaVaScRiPt:alert(1)','java&#x73;cript:alert(1)','java\tscript:alert(1)','data:text/html,evil','//evil.test','https://safe.test&#34;onclick=evil']) test(`unsafe URL ${JSON.stringify(url)} is not a live link`,()=>{
 const html=context.render(`<a href="${url}" onmouseover="bad()">link</a>`);
 assert.match(html,/href="#"/);assert.doesNotMatch(html,/<[^>]*\son\w+\s*=/i);
});
test('markdown javascript links remain plain text',()=>assert.doesNotMatch(context.render('[click](javascript:alert%281%29)'),/href=/));
test('safe https links and images retain only rebuilt attributes',()=>{
 const html=context.render('<a href="https://safe.test/path">ok</a> <img src="https://safe.test/i.png" onerror="evil()">');
 assert.match(html,/href="https:\/\/safe.test\/path"/);assert.doesNotMatch(html,/onerror/);
});
