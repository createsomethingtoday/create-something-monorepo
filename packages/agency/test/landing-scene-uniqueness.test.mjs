import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const markup=readFileSync(new URL('../src/lib/content/agency-story-home.html',import.meta.url),'utf8');
test('landing editorial scenes are distinct including hidden tour figures',()=>{
 const workshop=readFileSync(new URL('../src/lib/components/AgencyWorkshopPlate.svelte',import.meta.url),'utf8');
 const sources=[...(markup+workshop).matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)].filter(m=>!m[0].includes('data-guide-pose')).map(m=>m[1]);
 assert.equal(new Set(sources).size,sources.length,'each editorial image must tell a different scene');
 for(const src of sources) assert.ok(existsSync(new URL('../static'+src,import.meta.url)),src);
});
