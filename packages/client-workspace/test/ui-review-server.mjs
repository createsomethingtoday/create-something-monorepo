// Explicit loopback-only UI demo. Never loaded by the product build or runtime.
// All session responses are fixtures; no Codex, credentials, or managed roots are used.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = { id: 'demo-frontend', label: 'Demo frontend', editableRoots: ['src'] };
const codex = { state: 'ready', version: 'UI demo', authMode: 'Other' };
let events = [], status = 'ready', previewState = 'ready', changed = false, failNext = false, delayMs = 600;
const streams = new Set();
function emit(type, message, extra = {}) {
  const event = { sequence: events.length + 1, at: new Date().toISOString(), type, message, ...extra };
  events.push(event);
  for (const stream of streams) stream.write(`data: ${JSON.stringify(event)}\n\n`);
  return event;
}
const session = () => ({ workspace, active: status !== 'closed', receipt: { sessionId: 'ui-demo', workspaceId: workspace.id, status, updatedAt: new Date().toISOString(), events }, preview: { state: previewState, previewPath: '/__review/preview' } });
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4326, strictPort: true }, plugins: [{
  name: 'explicit-ui-review-demo', enforce: 'pre',
  transform(source, id) {
    if (id.endsWith('/src/routes/+page.server.ts')) return `export function load({url}) { return { workspaces: url.searchParams.has('empty') ? [] : url.searchParams.has('multiple') ? ${JSON.stringify([workspace,{...workspace,id:'demo-second',label:'Client portal'}])} : ${JSON.stringify([workspace])}, codex: url.searchParams.has('unavailable') ? {state:'missing'} : ${JSON.stringify(codex)}, desktop:false, remote:false, paperclipIssueUrl:null }; }`;
    if (id.endsWith('/src/routes/+page.svelte')) return source.replace('<div class="cs-workspace client-workspace">', '<div class="cs-workspace client-workspace"><div style="position:fixed;bottom:0;right:0;z-index:1000;padding:3px 8px;background:#fff;color:#111;font:11px monospace;pointer-events:none">LOCAL UI DEMO · fixture data</div>');
  },
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://127.0.0.1:4326');
      if (url.pathname === '/__review/preview') {
        res.setHeader('content-type','text/html');
        return res.end('<!doctype html><html><body style="margin:0;padding:32px;font:16px system-ui;background:#f5f5f2;color:#161616"><small>LOCAL DEMO PROJECT</small><h1>'+ (changed ? 'Move from intent to proof.' : 'A considered starting point.') +'</h1><p>This isolated preview demonstrates the workspace interface.</p></body></html>');
      }
      if (!url.pathname.startsWith('/api/') && url.pathname !== '/__review/state') return next();
      const chunks=[]; for await (const chunk of req) chunks.push(chunk);
      const body=Buffer.concat(chunks).toString();
      const json=(data,code=200)=>{res.statusCode=code;res.setHeader('content-type','application/json');res.end(JSON.stringify(data));};
      if(url.pathname==='/__review/state') {
        const state=JSON.parse(body); events=[]; status=state.status??'ready'; previewState=state.preview??'ready'; changed=false; failNext=Boolean(state.failNext); delayMs=Math.min(5000, Math.max(0, Number(state.delayMs) || 600));
        if(state.approval) emit('approval.requested','Review the proposed heading change.',{approvalId:'demo-approval',approvalKind:'file',paths:['src/App.svelte'],reason:'Update the visible heading.',scope:'Declared frontend only'});
        return json({ok:true});
      }
      if(failNext) {failNext=false;return json({error:'workspace_request_failed'},400);}
      if(url.pathname.endsWith('/events')) {res.setHeader('content-type','text/event-stream');res.setHeader('cache-control','no-cache');res.write(': ui demo\n\n'); streams.add(res);res.on('close',()=>streams.delete(res));return;}
      if(url.pathname==='/api/runtime/codex') return json(codex);
      if(url.pathname.endsWith('/sessions') && req.method==='POST') {events=[]; status='ready'; previewState='ready'; changed=false;await new Promise(resolve=>setTimeout(resolve,delayMs));return json(session(),201);}
      if(url.pathname.endsWith('/turns')) {
        const user=emit('user.message','Client edit request submitted.');status='running';
        json({turnId:'demo-turn',userEventSequence:user.sequence});
        setTimeout(()=>{emit('turn.started','Reviewing the requested change.');emit('agent.message','I will update the heading, then check the result.');emit('approval.requested','Review the proposed heading change.',{approvalId:'demo-approval',approvalKind:'file',paths:['src/App.svelte'],reason:'Update the visible heading.',scope:'Declared frontend only'});},500);return;
      }
      if(url.pathname.includes('/approvals/')) {const {decision}=JSON.parse(body);emit('approval.resolved',decision==='accept'?'Bounded action approved.':'Action declined.',{approvalId:'demo-approval',status:decision==='accept'?'accepted':'declined'});changed=decision==='accept';status='completed';emit('agent.message',changed?'Updated the heading. Review the diff and preview.':'The change was declined. Source is unchanged.');emit('turn.completed','Demo turn complete.');return json({ok:true});}
      if(url.pathname.endsWith('/diff')) return json({diff:changed?'diff --git a/src/App.svelte b/src/App.svelte\n-<h1>A considered starting point.</h1>\n+<h1>Move from intent to proof.</h1>':''});
      if(url.pathname.endsWith('/history')) return json({status:'empty',results:[]});
      if(url.pathname.endsWith('/close') || url.pathname.endsWith('/reset')) {status='closed';return json({ok:true});}
      if(url.pathname.endsWith('/preview')) return json(session().preview);
      if(url.pathname.endsWith('/receipt')) return json(session().receipt);
      if(url.pathname==='/api/sessions/ui-demo') return json(session());
      return json({error:'workspace_request_failed'},400);
    });
  }
}] });
await server.listen(); console.log('LOCAL UI DEMO (fixtures only): http://127.0.0.1:4326');
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{for(const stream of streams)stream.end();await server.close();process.exit(0);});
