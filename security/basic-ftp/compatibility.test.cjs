const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const requireParent = createRequire(join(process.env.GET_URI_MODULE, 'package.json'));
const { getUri } = requireParent('./dist/index.js');
const ftpPath = requireParent.resolve('basic-ftp');
const ftp = requireParent('basic-ftp');
const payload = 'synthetic download fixture\n';

async function server(t, options = {}) {
  const sockets = new Set(), servers = new Set(), commands = [];
  const control = net.createServer(socket => {
    sockets.add(socket);socket.on('error',()=>{});socket.on('close',()=>sockets.delete(socket));
    let buffer = '', data, pending;
    socket.write('220 synthetic fixture\r\n');
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const at=buffer.indexOf('\r\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+2);
        const cmd=line.split(' ')[0];commands.push(cmd);
        if(cmd==='USER')socket.write('331 password\r\n');
        else if(cmd==='PASS')socket.write(options.deny?'530 denied\r\n':'230 logged in\r\n');
        else if(cmd==='FEAT')socket.write('211-Features\r\n MLST type*;size*;modify*;\r\n211 End\r\n');
        else if(cmd==='MDTM')socket.write(options.missing?'550 missing\r\n':options.fallback?'500 unsupported\r\n':'213 20261020010203\r\n');
        else if(cmd==='EPSV' && options.pasv)socket.write('500 use PASV\r\n');
        else if(cmd==='EPSV' || cmd==='PASV'){
          const passive=net.createServer(s=>{data=s;sockets.add(s);s.on('error',()=>{});s.on('close',()=>sockets.delete(s));if(pending)pending();});servers.add(passive);
          passive.listen(0,'127.0.0.1',()=>{const port=passive.address().port;socket.write(cmd==='EPSV'?`229 Entering Extended Passive Mode (|||${port}|)\r\n`:`227 Entering Passive Mode (127,0,0,1,${Math.floor(port/256)},${port%256})\r\n`);});
        } else if(['RETR','LIST','MLSD'].includes(cmd)){
          const content=cmd==='RETR'?payload:`type=file;size=${Buffer.byteLength(payload)};modify=20261020010203; fixture.txt\r\n`;
          socket.write('150 transfer\r\n');
          const send=()=>{pending=undefined;data.end(content,()=>socket.write('226 complete\r\n'));};
          if(data)send();else pending=send;
        } else if(cmd==='QUIT')socket.end('221 bye\r\n');
        else socket.write('200 ok\r\n');
      }
    });
  });
  servers.add(control);control.listen(0,'127.0.0.1');await once(control,'listening');
  t.after(async()=>{for(const s of sockets)s.destroy();await Promise.all([...servers].map(s=>new Promise(resolve=>s.close(resolve))));});
  return {url:`ftp://fixture:synthetic@127.0.0.1:${control.address().port}/fixture.txt`,commands};
}
async function text(stream){let value='';for await(const chunk of stream)value+=chunk;return value;}
test('actual get-uri consumer resolves precisely patched 6.2.1 CommonJS API',()=>{
  assert.equal(requireParent('basic-ftp/package.json').version,'6.2.1');
  for(const method of ['access','lastMod','list','downloadTo','close']) assert.equal(typeof ftp.Client.prototype[method],'function');
});
test('get-uri downloads exact bytes with MDTM and preserves cache semantics',{timeout:10000},async t=>{
  const f=await server(t);const stream=await getUri(f.url);assert.equal(await text(stream),payload);assert.equal(stream.lastModified.toISOString(),'2026-10-20T01:02:03.000Z');
  await assert.rejects(getUri(f.url,{cache:stream}),e=>e.code==='ENOTMODIFIED');assert.ok(f.commands.includes('RETR'));
});
test('get-uri falls back to listing when MDTM is unsupported',{timeout:10000},async t=>{
  const f=await server(t,{fallback:true});const stream=await getUri(f.url);assert.equal(await text(stream),payload);assert.ok(f.commands.some(c=>['LIST','MLSD'].includes(c)));
});
test('missing files and authentication failures remain rejected',{timeout:10000},async t=>{
  const missing=await server(t,{missing:true});await assert.rejects(getUri(missing.url),e=>e.code==='ENOTFOUND');assert.ok(!missing.commands.includes('RETR'));
  const denied=await server(t,{deny:true});await assert.rejects(getUri(denied.url),e=>e.code===530);assert.ok(!denied.commands.includes('RETR'));
});
test('Unix listing compatibility and malformed long-line parsing are bounded',()=>{
  // Separate process bounds the regression even if a vulnerable parser regresses.
  const script=`const {parseList}=require(process.argv[1]);const assert=require('node:assert/strict');const good='-rw-r--r-- 1 owner group 42 Jan 1 2020 fixture.txt';const valid=parseList(good);assert.equal(valid[0].name,'fixture.txt');assert.equal(valid[0].size,42);parseList('-rw-r--r-- 1 '+'a '.repeat(65536)+'!\\r\\n'+good);`;
  const result=spawnSync(process.execPath,['-e',script,ftpPath],{timeout:5000,encoding:'utf8'});
  assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);
});

test('same-host PASV download remains supported when EPSV is unavailable',{timeout:10000},async t=>{
  const f=await server(t,{pasv:true});assert.equal(await text(await getUri(f.url)),payload);assert.ok(f.commands.includes('PASV'));
});
test('v6 rejects a different passive data host before creating any network socket',async()=>{
  const {enterPassiveModeIPv4_forceControlHostIP}=requireParent('basic-ftp/dist/transfer');
  let attempts=0;
  const context={request:async()=>({message:'227 Entering Passive Mode (192,0,2,1,10,10)'}),socket:{remoteAddress:'127.0.0.1'},_newSocket(){attempts++;throw new Error('unexpected network attempt');}};
  await assert.rejects(enterPassiveModeIPv4_forceControlHostIP(context),/another host/);assert.equal(attempts,0);
});
