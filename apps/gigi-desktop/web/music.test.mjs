import test from 'node:test';
import assert from 'node:assert/strict';
import { musicView, musicEditView } from './music-view.mjs';
test('music workspace escapes private names and presents reconnect without implying upload',()=>{
 const html=musicView({items:[{id:'one',title:'<script>',filename:'song.mp4',kind:'video',availability:'missing',bytes:24}],total:1});
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('Reconnect'));
 assert.ok(html.includes('not uploaded'));
 assert.ok(!html.includes('data-music-preview="one"'));
});
test('projects have honest preview limits and organization fields survive escaped values',()=>{
 const item={id:'project',title:'Draft & Session',filename:'song.als',kind:'project',availability:'available',project:'Night Drive',version:'Mix 03',collection:'References',tags:'ambient'};
 const html=musicView({items:[item],total:1});
 assert.ok(html.includes('Indexed · no in-app preview'));
 assert.ok(!html.includes('data-music-preview="project"'));
 const editor=musicEditView({...item,title:'"quoted" <title>'});
 for(const field of ['title','artist','project','version','collection','tags']) assert.ok(editor.includes(`name="${field}"`));
 assert.ok(editor.includes('&quot;quoted&quot; &lt;title&gt;'));
});
test('bounded paging and cancellation are explicit',()=>{
 const html=musicView({items:Array.from({length:100},(_,i)=>({id:String(i),title:'Track',kind:'audio',availability:'available'})),total:205,offset:100,hasMore:true,busy:true,importing:true});
 assert.ok(html.includes('101–200 of 205'));
 assert.ok(html.includes('Cancel import'));
 assert.ok(html.includes('up to 1,000'));
 assert.ok(!musicView({busy:true}).includes('Cancel import'));
});

test('unsupported video containers retain music organization without a preview action',()=>{
 const html=musicView({items:[{id:'mkv',title:'Reference',filename:'reference.mkv',kind:'video',previewable:false,availability:'available'}],total:1});
 assert.ok(html.includes('Music video'));assert.ok(html.includes('Indexed · no in-app preview'));assert.ok(!html.includes('data-music-preview="mkv"'));assert.ok(html.includes('data-music-edit="mkv"'));
});
