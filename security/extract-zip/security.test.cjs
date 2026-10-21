const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const extract = require(process.env.EXTRACT_ZIP_MODULE || 'extract-zip')

// Stored ZIP writer: readable fixtures, including duplicate names and Unix symlinks.
function zip(entries) {
  let offset = 0
  const files = [], directory = []
  for (const { name, data = '', mode = 0o100644 } of entries) {
    const n = Buffer.from(name), b = Buffer.from(data)
    let crc = 0xffffffff
    for (const byte of b) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)) }
    crc = (crc ^ 0xffffffff) >>> 0
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc, 14); h.writeUInt32LE(b.length, 18); h.writeUInt32LE(b.length, 22); h.writeUInt16LE(n.length, 26)
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(0x0314, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16); c.writeUInt32LE(b.length, 20); c.writeUInt32LE(b.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE((mode << 16) >>> 0, 38); c.writeUInt32LE(offset, 42)
    files.push(h, n, b); directory.push(c, n); offset += h.length + n.length + b.length
  }
  const d = Buffer.concat(directory), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(d.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...files, d, end])
}
async function fixture(t, entries) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'extract-zip-security-'))
  t.after(() => fs.rm(base, {recursive:true,force:true}))
  const dir = path.join(base, 'root'), outside = path.join(base, 'outside')
  await fs.mkdir(dir); await fs.mkdir(outside); await fs.writeFile(path.join(outside,'sentinel'), 'safe')
  const archive = path.join(base,'fixture.zip'); await fs.writeFile(archive,zip(typeof entries==='function'?entries({base,dir,outside}):entries))
  return {base,dir,outside,run:options=>extract(archive,{dir,...options}),safe:async()=>assert.equal(await fs.readFile(path.join(outside,'sentinel'),'utf8'),'safe')}
}
const link = (name,data) => ({name,data,mode:0o120777})
for (const [name,target] of [['relative','../outside/sentinel'],['absolute','/tmp/extract-zip-forbidden'],['windows','C:\\outside\\sentinel'],['UNC','\\\\server\\share']]) {
  test(`reject ${name} escaping symlink`, async t => { const f=await fixture(t,[link('evil',target)]); await assert.rejects(f.run()); await assert.rejects(fs.lstat(path.join(f.dir,'evil'))); await f.safe() })
}
test('reject same-name escaping symlink followed by regular file', async t=>{const f=await fixture(t,[link('evil','../outside/sentinel'),{name:'evil',data:'attack'}]);await assert.rejects(f.run());await f.safe()})
test('replace final pre-existing symlink without writing its target',async t=>{const f=await fixture(t,[{name:'evil',data:'inside'}]);await fs.symlink(path.join(f.outside,'sentinel'),path.join(f.dir,'evil'));await f.run();await f.safe();assert.equal(await fs.readFile(path.join(f.dir,'evil'),'utf8'),'inside');assert.equal((await fs.lstat(path.join(f.dir,'evil'))).isSymbolicLink(),false)})
test('reject parent escape before creating any external directory',async t=>{const f=await fixture(t,[{name:'evil/new/deep/file',data:'attack'}]);await fs.symlink(f.outside,path.join(f.dir,'evil'));await assert.rejects(f.run());assert.deepEqual(await fs.readdir(f.outside),['sentinel']);await f.safe()})
test('reject directory entry aimed at external symlink',async t=>{const f=await fixture(t,[{name:'evil/',mode:0o40755}]);await fs.symlink(f.outside,path.join(f.dir,'evil'));await assert.rejects(f.run());await f.safe()})
test('reject lexically internal link targeting existing external symlink',async t=>{const f=await fixture(t,[link('new','existing/sentinel')]);await fs.symlink(f.outside,path.join(f.dir,'existing'));await assert.rejects(f.run());await assert.rejects(fs.lstat(path.join(f.dir,'new')));await f.safe()})
test('reject traversal in ZIP entry name',async t=>{const f=await fixture(t,[{name:'../outside/sentinel',data:'attack'}]);await assert.rejects(f.run());await f.safe()})
test('browser-style framework links, forward links, modes, onEntry and duplicate regular files remain supported',async t=>{const f=await fixture(t,[link('Framework/Versions/Current','A'),link('Framework/Resources','Versions/Current/Resources'),{name:'Framework/Versions/A/Resources/info',data:'valid'},{name:'bin/browser',data:'old',mode:0o100755},{name:'bin/browser',data:'new',mode:0o100755}]);const names=[];await f.run({onEntry:e=>names.push(e.fileName)});assert.equal(names.length,5);assert.equal(await fs.readFile(path.join(f.dir,'Framework/Resources/info'),'utf8'),'valid');assert.equal(await fs.readFile(path.join(f.dir,'bin/browser'),'utf8'),'new');if(process.platform !== 'win32') assert.equal((await fs.stat(path.join(f.dir,'bin/browser'))).mode&0o111,0o111)})
test('write through safe in-root parent link remains supported',async t=>{const f=await fixture(t,[{name:'actual/',mode:0o40755},link('alias','actual'),{name:'alias/file',data:'valid'}]);await f.run();assert.equal(await fs.readFile(path.join(f.dir,'actual/file'),'utf8'),'valid')})
test('replace internal final link with a file without mutating old target',async t=>{const f=await fixture(t,[{name:'target',data:'original'},link('alias','target'),{name:'alias',data:'new'}]);await f.run();assert.equal(await fs.readFile(path.join(f.dir,'target'),'utf8'),'original');assert.equal(await fs.readFile(path.join(f.dir,'alias'),'utf8'),'new')})
test('reject absolute existing symlink with symlink/.. semantics',async t=>{const f=await fixture(t,[link('new','existing/sentinel')]);await fs.symlink('.',path.join(f.dir,'a'));await fs.symlink(f.dir+'/a/../outside',path.join(f.dir,'existing'));await assert.rejects(f.run());await assert.rejects(fs.lstat(path.join(f.dir,'new')));await f.safe()})
test('reject forward link made external by a later link and remove archive links',async t=>{const f=await fixture(t,[link('x','a/../outside'),link('a','.')]);await assert.rejects(f.run());await assert.rejects(fs.lstat(path.join(f.dir,'x')));await f.safe()})
test('reject symlink cycles and remove archive links',async t=>{const f=await fixture(t,[link('a','b'),link('b','a')]);await assert.rejects(f.run());await assert.rejects(fs.lstat(path.join(f.dir,'a')));await f.safe()})
test('replace hard-linked destination without changing outside inode',async t=>{const f=await fixture(t,[{name:'alias',data:'new'}]);await fs.link(path.join(f.outside,'sentinel'),path.join(f.dir,'alias'));await f.run();await f.safe();assert.equal(await fs.readFile(path.join(f.dir,'alias'),'utf8'),'new')})
test('failed rename removes temporary file',async t=>{const f=await fixture(t,[{name:'directory',data:'new'}]);await fs.mkdir(path.join(f.dir,'directory'));await assert.rejects(f.run());assert.deepEqual(await fs.readdir(f.dir),['directory'])})
test('reject changes that make a pre-existing forward link escape',async t=>{const f=await fixture(t,[link('a','.')]);await fs.symlink('a/../outside/sentinel',path.join(f.dir,'preexisting'));await assert.rejects(f.run());await assert.rejects(fs.lstat(path.join(f.dir,'a')));await assert.rejects(fs.readFile(path.join(f.dir,'preexisting')));await f.safe()})
test('reject self-link and remove it',async t=>{const f=await fixture(t,[link('self','self')]);await assert.rejects(f.run());await assert.rejects(fs.lstat(path.join(f.dir,'self')));await f.safe()})
test('safe canonical absolute existing link and relative parent components remain supported',async t=>{const f=await fixture(t,[link('nested/new','../existing/file')]);await fs.mkdir(path.join(f.dir,'actual'));await fs.writeFile(path.join(f.dir,'actual/file'),'valid');await fs.symlink(path.join(await fs.realpath(f.dir),'actual'),path.join(f.dir,'existing'));await f.run();assert.equal(await fs.readFile(path.join(f.dir,'nested/new'),'utf8'),'valid');await f.run();assert.equal(await fs.readFile(path.join(f.dir,'nested/new'),'utf8'),'valid')})
