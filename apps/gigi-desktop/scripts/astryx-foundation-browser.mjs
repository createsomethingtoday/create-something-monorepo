// Actual GiGi HTML/CSS/ESM with synthetic records only. Never opens the installed
// app, a user profile/database, or a provider. All native calls fail closed.
// node scripts/astryx-foundation-browser.mjs --serve --port 4383
// node scripts/astryx-foundation-browser.mjs --check --out /tmp/gigi-astryx-evidence
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const web = fileURLToPath(new URL('../web/', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const serve = args.includes('--serve');
const baseline = args.includes('--baseline');
const port = Number(option('--port', serve ? '4383' : '0'));
if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid --port');
const out = resolve(option('--out', '/tmp/gigi-astryx-evidence'));

const denyNative = `<script>
globalThis.astryxDeniedOperations = [];
globalThis.__TAURI__ = {core:{invoke:async (_command,request={})=>{
  globalThis.astryxDeniedOperations.push(request.operation || _command);
  throw Error('Denied synthetic preview operation: ' + (request.operation || _command));
}}};
</script>`;

const fixture = String.raw`
globalThis.astryxFixture = ({view='overview',theme='studio',density='comfortable',empty=false,chatState='idle',prefs={}}={}) => {
  root.querySelector('.chat-panel')?.remove();
  state.workspace={id:'synthetic-astryx-foundation',name:'Rehearsal workspace · synthetic'};
  state.currency='USD';state.currencyKnown=true;state.page=view==='chat'?'overview':view;
  state.selected=null;state.editing=false;state.editorDraft=null;state.editorOrigin=null;
  state.toast=null;state.busy=false;state.sourceExpanded=false;state.justCreated=false;
  editorBaseline=null;submittedEditor=null;pendingLeave=null;
  const record=(id,title,entity='tasks')=>({id,title,entity,date:'2026-11-08',status:'in_progress',fields:{Status:'in_progress',Date:'2026-11-08',Notes:'Synthetic rehearsal details. No private records are loaded.'}});
  const tasks=empty?[]:[record('task-1','Confirm the revised rehearsal time'),record('task-2','Review the stage plan with the crew')];
  const gigs=empty?[]:[record('gig-1','Autumn showcase · soundcheck','gigs'),record('gig-2','Evening set at the studio','gigs')];
  state.overview={counts:empty?{}:{tasks:6,gigs:8,finances:2,contacts:12},events:{items:gigs,count:empty?0:8},tasks:{items:tasks,count:empty?0:6},finances:{items:[],count:0}};
  state.records=view==='tasks'?tasks:[];state.recordCount=state.records.length;state.nextCursor=null;
  state.sources={};state.agent=null;state.agentReceipt=null;
  attention={items:empty?[]:[{id:'attention-1',recordId:'task-1',entity:'tasks',kind:'task_due',unread:true,title:'Confirm the revised rehearsal time',body:'Due today. Review the saved task before deciding what happens next.'},{id:'attention-2',sessionId:'session-1',kind:'approval',unread:true,title:'Review the rehearsal checklist',body:'A change is ready for review. Nothing changes until you approve.'}],unreadCount:empty?0:2};
  preferences={...defaults,theme,density,...prefs};applyPreferences(preferences);
  chat=new ChatController({},state.workspace.id,renderChat,()=>{},()=>0,()=>{});
  Object.defineProperty(chat,'preferences',{get:()=>preferences});
  chat.visible=view==='chat';chat.status={available:true,authenticated:true};chat.draft='Keep this synthetic draft';
  chat.sessions=[{sessionId:'synthetic-session',title:'Rehearsal plan',state:chatState}];
  chat.current={sessionId:'synthetic-session',state:chatState,messages:[{id:'synthetic-user',role:'user',text:'Help me review the rehearsal plan.'},{id:'synthetic-answer',role:'assistant',text:'# Rehearsal plan\n\nReview the saved call time and stage plan.\n\n- Confirm the venue details.\n- Check the crew schedule.\n\nThese are synthetic records for design review.'}],recordLinks:[],approvals:chatState==='approval'?[{id:'synthetic-approval',title:'Approve gigi_records_save',detail:JSON.stringify({workspaceId:state.workspace.id,entity:'tasks',title:'Confirm the rehearsal time',fields:{Status:'Open',Notes:'Synthetic proposal. Nothing is saved in this preview.'}})}]:[]};
  render();
};
globalThis.astryxNotice=(text,error=true)=>notice(text,error);
globalThis.astryxRender=render;
globalThis.astryxRestorePreferences=()=>{restorePreferences();render();};
globalThis.astryxChatAppend=text=>{chat.current.messages[1].text+=text;renderChat();};
const fixtureQuery=new URLSearchParams(location.search);
globalThis.astryxFixture({view:fixtureQuery.get('fixture')||'overview',theme:fixtureQuery.get('theme')||'studio',density:fixtureQuery.get('density')||'comfortable',empty:fixtureQuery.get('empty')==='1',chatState:fixtureQuery.get('state')||'idle'});
`;

const mime = { '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  const url = new URL(req.url, 'http://127.0.0.1');
  let pathname;
  try { pathname=decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); }
  catch { res.writeHead(400); return res.end(); }
  const path = resolve(web, '.' + pathname);
  if (!path.startsWith(web) || !mime[extname(path)] || !existsSync(path) || !statSync(path).isFile()) { res.writeHead(404); return res.end(); }
  let body;
  try { body=baseline?execFileSync('git',['show',`HEAD:${relative(resolve(web,'../../..'),path)}`],{cwd:web,maxBuffer:16*1024*1024}):readFileSync(path); }
  catch { res.writeHead(404); return res.end(); }
  if (path.endsWith('/index.html')) body = body.toString().replace('<script type="module"', denyNative + '<script type="module"');
  if (path.endsWith('/app.mjs')) {
    const source = body.toString();
    const boundary = source.lastIndexOf('load().catch');
    if (boundary < 0) { res.writeHead(500); return res.end('Fixture bootstrap boundary missing'); }
    body = source.slice(0, boundary) + fixture;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(path)], 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'" });
  res.end(req.method === 'HEAD' ? undefined : body);
});
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
if (serve) {
  console.log(JSON.stringify({ origin, views: ['overview','appearance','tasks','settings','chat'].map(view => `${origin}/?fixture=${view}`), approval: `${origin}/?fixture=chat&state=approval`, scope: 'Synthetic preview. All native/provider calls denied. Stop with Ctrl-C.' }));
  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
} else {
  mkdirSync(out, { recursive: true });
  const { chromium } = createRequire(new URL('../../../packages/agency/package.json', import.meta.url))('@playwright/test');
  let browser;
  const metrics = [];
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 880, height: 620 }, reducedMotion: 'reduce' });
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin);await page.waitForFunction(() => globalThis.astryxFixture);
    if(baseline) {
      for(const width of [880,1280]) for(const theme of ['studio','paper','midnight']) {
        await page.setViewportSize({width,height:width===880?620:840});
        await page.evaluate(theme=>astryxFixture({theme}),theme);
        await page.screenshot({path:resolve(out,`before-overview-${theme}-${width}.png`),fullPage:true});
      }
      console.log(JSON.stringify({baseline:true,out,scope:'Screenshots only of git HEAD app assets with the same synthetic fixture. No candidate-token assertions.'}));
    } else {
    const noOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label}: horizontal overflow`);
    // Resolve browser-supported CSS colors (including OKLCH), alpha-composite
    // them against ancestor surfaces, then apply WCAG relative luminance.
    const colors = async (selector, property='color') => page.locator(selector).first().evaluate((node,property)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const rgba=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);};
      const over=(top,bottom)=>{const a=top[3]+bottom[3]*(1-top[3]);return [...[0,1,2].map(i=>(top[i]*top[3]+bottom[i]*bottom[3]*(1-top[3]))/a),a];};
      const surface=element=>{if(!element)return [255,255,255,1];return over(rgba(getComputedStyle(element).backgroundColor),surface(element.parentElement));};
      const style=getComputedStyle(node);const bg=surface(node);return {foreground:over(rgba(style[property]),bg),background:bg,raw:style[property],width:style.outlineWidth,outlineStyle:style.outlineStyle};
    },property);
    const luminance=rgb=>rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const ratio=async(selector,property='color')=>{const c=await colors(selector,property);return contrast(c.foreground,c.background);};
    for (const width of [880,1280]) for(const theme of ['studio','paper','midnight']) for(const density of ['comfortable','compact']) {
      const label=`${theme}-${width}-${density}`;
      await page.setViewportSize({width,height:width===880?620:840});
      await page.evaluate(options=>astryxFixture(options),{theme,density});
      await noOverflow(label);
      const primary=await ratio('.today-create .btn.primary');
      const text=await ratio('h1');const secondary=await ratio('.subhead');
      metrics.push({label,primary,text,secondary});
      assert.ok(primary>=4.5,`${label}: primary action contrast ${primary}`);
      assert.ok(text>=4.5,`${label}: primary text contrast ${text}`);
      assert.ok(secondary>=4.5,`${label}: secondary text contrast ${secondary}`);
      await page.screenshot({path:resolve(out,`${label}.png`),fullPage:true});
    }
    await page.setViewportSize({width:880,height:620});
    for(const theme of ['studio','paper','midnight']) {
      await page.evaluate(theme=>astryxFixture({theme}),theme);
      const action=page.locator('.today-create .btn.primary');
      const resting=await action.evaluate(node=>getComputedStyle(node).backgroundColor);
      await action.hover();
      const hovered=await action.evaluate(node=>getComputedStyle(node).backgroundColor);
      assert.notEqual(hovered,resting,`${theme}: primary hover is visible`);
      assert.ok(await ratio('.today-create .btn.primary')>=4.5,`${theme}: hover text contrast`);
      // Prevent the local navigation click; use real pointer input to establish
      // CSS :active, rather than dispatchEvent (which cannot establish it).
      await action.evaluate(node=>node.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();},{capture:true,once:true}));
      await page.mouse.down();
      try {
        assert.equal(await action.evaluate(node=>node.matches(':active')),true,`${theme}: pointer press is active`);
        assert.notEqual(await action.evaluate(node=>getComputedStyle(node).backgroundColor),hovered,`${theme}: primary press is visible`);
        assert.ok(await ratio('.today-create .btn.primary')>=4.5,`${theme}: pressed text contrast`);
      } finally { await page.mouse.up(); }
      await page.evaluate(theme=>astryxFixture({view:'tasks',theme}),theme);
      await page.locator('[data-new="tasks"]').first().click();
      await page.locator('#title').fill('Keep this unsaved synthetic task');
      await page.locator('#title').evaluate(node=>node.blur());
      const border=await ratio('#title','borderTopColor');
      await page.locator('#title').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
      const focus=await ratio('#title','outlineColor');
      metrics.push({theme,inputBoundary:border,inputFocus:focus});
      const outline=await colors('#title','outlineColor');
      assert.ok(border>=3,`${theme}: input boundary contrast ${border}`);
      assert.ok(focus>=3&&parseFloat(outline.width)>=2&&outline.outlineStyle!=='none',`${theme}: input focus contrast ${focus}`);
      await noOverflow(`${theme} task editor`);
      await page.screenshot({path:resolve(out,`${theme}-task-editor.png`),fullPage:true});
      await page.locator('.reference-nav [data-page="contacts"]').click();
      await page.getByRole('alertdialog').waitFor();await page.keyboard.press('Escape');
      assert.equal(await page.locator('#title').inputValue(),'Keep this unsaved synthetic task');
      await page.evaluate(()=>astryxNotice('Synthetic read unavailable. Your unsaved draft is retained.'));
      assert.ok(await ratio('.toast.error')>=4.5,`${theme}: error text contrast`);
      assert.equal(await page.locator('.toast.error[role="alert"]').count(),1);
      await page.evaluate(theme=>astryxFixture({view:'chat',theme,chatState:'approval'}),theme);
      assert.ok(await ratio('.chat-approval')>=4.5,`${theme}: approval text contrast`);
      assert.match(await page.locator('.chat-approval').innerText(),/Approve changes/);
      await noOverflow(`${theme} approval`);
      assert.equal(await page.locator('.chat-approval').evaluate(node=>getComputedStyle(node).borderRadius),'16px',`${theme}: approval uses the shared container shape`);
      await page.screenshot({path:resolve(out,`${theme}-approval.png`),fullPage:true});
      // Semantic status roles must exist and remain legible without relying on
      // hue alone; the actual error/approval UI above retains explanatory text.
      for(const role of ['error','warning','success']) {
        await page.evaluate(role=>{const probe=document.createElement('span');probe.id='status-probe';probe.textContent=role;probe.style.cssText=`color:var(--color-text-${role});background:var(--color-background-surface)`;document.body.append(probe);},role);
        const statusContrast=await ratio('#status-probe');
        metrics.push({theme,role,contrast:statusContrast});
        assert.ok(statusContrast>=4.5,`${theme}: ${role} semantic text contrast`);
        const present=await page.evaluate(role=>getComputedStyle(document.documentElement).getPropertyValue(`--color-text-${role}`).trim(),role);
        assert.ok(present,`${theme}: missing ${role} semantic role`);
        await page.locator('#status-probe').evaluate(node=>node.remove());
      }
      await page.evaluate(theme=>astryxFixture({view:'appearance',theme}),theme);
      await noOverflow(`${theme} appearance`);
      await page.screenshot({path:resolve(out,`${theme}-appearance.png`),fullPage:true});
    }
    await page.evaluate(()=>astryxFixture());
    await page.locator('[data-nav-overflow]').focus();await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('.reference-more').evaluate(node=>node.open),true);
    assert.equal(await page.locator('.reference-menu [data-page]').first().evaluate(node=>node===document.activeElement),true);
    await page.keyboard.press('End');await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nav-overflow]').evaluate(node=>node===document.activeElement),true);
    await page.evaluate(()=>astryxFixture({empty:true}));await noOverflow('empty overview');
    await page.screenshot({path:resolve(out,'empty-overview.png'),fullPage:true});
    await page.evaluate(()=>astryxFixture({view:'settings'}));await noOverflow('settings');
    await page.screenshot({path:resolve(out,'settings.png'),fullPage:true});
    await page.evaluate(()=>astryxFixture({view:'chat'}));
    await page.locator('.chat-view-options>summary').click();
    await page.locator('#chat-chatWidth').selectOption('wide');
    await page.locator('#chat-chatTextSize').selectOption('larger');
    await page.locator('#chat-chatDensity').selectOption('compact');
    const retained=await page.evaluate(()=>({...document.documentElement.dataset}));
    assert.equal(retained.chatWidth,'wide');assert.equal(retained.chatTextSize,'larger');assert.equal(retained.chatDensity,'compact');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gigi:chat-preferences:v1:synthetic-astryx-foundation')));
    assert.equal(saved.chatWidth,'wide');assert.equal(saved.chatTextSize,'larger');assert.equal(saved.chatDensity,'compact');
    await page.evaluate(()=>{document.documentElement.dataset.chatWidth='standard';document.documentElement.dataset.chatTextSize='standard';document.documentElement.dataset.chatDensity='comfortable';astryxRestorePreferences();});
    const restored=await page.evaluate(()=>({...document.documentElement.dataset}));
    assert.equal(restored.chatWidth,'wide');assert.equal(restored.chatTextSize,'larger');assert.equal(restored.chatDensity,'compact');
    await page.locator('#chat-message').fill('Keep this synthetic chat draft');
    await page.evaluate(()=>astryxChatAppend('\n\nA newly observed synthetic response.'));
    assert.equal(await page.locator('#chat-message').inputValue(),'Keep this synthetic chat draft');
    await noOverflow('wide chat');
    assert.equal(await page.locator('.chat-panel').evaluate(node=>node.getAnimations({subtree:true}).length),0,'reduced motion removes active chat animation');
    await page.screenshot({path:resolve(out,'chat-preferences.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>astryxDeniedOperations.some(name=>/save|import|approve|send|restore|link/.test(name))),false,'no mutation/provider operation attempted');
    assert.deepEqual(errors,[],'no uncaught browser errors');
    const result={passed:true,metrics,out,scope:'Actual app DOM/CSS in isolated Chromium with synthetic records. No installed app, native WebKit, provider, source-consent, or production acceptance.'};
    writeFileSync(resolve(out,'metrics.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
    }
  } finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
}
