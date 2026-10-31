import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
function origin(status=200, customSize=false) {
  const state={cancelled:false,reads:0};
  const env={ASSETS:{async fetch(request){state.request=request;let offset=0;return new Response(request.method==='HEAD'?null:new ReadableStream({pull(c){state.reads++;if(offset===100){c.close();return;}c.enqueue(Uint8Array.from({length:10},(_,i)=>offset+i));offset+=10;},cancel(){state.cancelled=true;}},{highWaterMark:0}),{status,headers:{...(customSize?{'x-walkthrough-bytes':'100'}:{'content-length':'100'}),'content-type':'video/mp4','etag':'"v1"','last-modified':'Wed, 28 Oct 2026 12:00:00 GMT','x-content-type-options':'nosniff'}});}}};
  return {env,state};
}
const request=(range,path='/screen.mp4',extra={},method='GET')=>new Request('https://example.com'+path,{method,headers:{...(range?{range}:{}),...extra}});
for(const [range,start,end] of [['bytes=0-31',0,31],['bytes=91-',91,99],['bytes=-7',93,99],['bytes=98-999',98,99]]) test(range,async()=>{
 const {env,state}=origin();const r=await worker.fetch(request(range),env);assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/100`);assert.equal(r.headers.get('content-length'),String(end-start+1));assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],Array.from({length:end-start+1},(_,i)=>start+i));assert.equal(state.cancelled,true);
 if(end===31)assert.equal(state.reads,4);
});
for(const range of ['bytes=100-','bytes=8-2','bytes=-0','bytes=x-y','bytes=0-1,4-5'])test('invalid '+range,async()=>{const {env,state}=origin();const r=await worker.fetch(request(range),env);assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */100');assert.equal(state.cancelled,true);});
test('If-Range validators and normal GET/HEAD',async()=>{
 for(const validator of ['"other"','W/"v1"','Tue, 27 Oct 2026 12:00:00 GMT']){const {env}=origin();const r=await worker.fetch(request('bytes=0-1','/screen.mp4',{'if-range':validator}),env);assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,100);}
 for(const validator of ['"v1"','Wed, 28 Oct 2026 12:00:00 GMT']){const {env}=origin();assert.equal((await worker.fetch(request('bytes=0-1','/screen.mp4',{'if-range':validator}),env)).status,206);}
 for(const method of ['GET','HEAD']){const {env}=origin();assert.equal((await worker.fetch(request(null,'/screen.mp4',{},method),env)).status,200);}
});
test('native 206 and nonvideo pass through',async()=>{for(const [status,path] of [[206,'/screen.mp4'],[200,'/index.html']]){const {env}=origin(status);assert.equal((await worker.fetch(request('bytes=0-1',path),env)).status,status);}});
test('client cancellation cancels source',async()=>{const {env,state}=origin();const r=await worker.fetch(request('bytes=0-99'),env);await r.body.cancel();assert.equal(state.cancelled,true);});

test('asset binding without Content-Length uses generated size header',async()=>{const {env}=origin(200,true);const r=await worker.fetch(request('bytes=0-31'),env);assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 0-31/100');assert.equal((await r.arrayBuffer()).byteLength,32);});

test('video ranges fetch full upstream metadata even when Assets drops headers for invalid ranges',async()=>{
 let upstream;
 const env={ASSETS:{async fetch(req){upstream=req;return new Response(new Uint8Array(100),{headers:req.headers.has('range')?{}:{'x-walkthrough-bytes':'100','etag':'"v1"','x-content-type-options':'nosniff'}});}}};
 const r=await worker.fetch(request('bytes=999999999-','/screen-mobile.mp4',{'if-range':'"v1"'}),env);
 assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */100');assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(upstream.headers.has('range'),false);assert.equal(upstream.headers.has('if-range'),false);
});
test('nonvideo range requests retain upstream semantics',async()=>{const {env,state}=origin();await worker.fetch(request('bytes=0-31','/other.mp4',{'if-range':'"v1"'}),env);assert.equal(state.request.headers.get('range'),'bytes=0-31');assert.equal(state.request.headers.get('if-range'),'"v1"');});
