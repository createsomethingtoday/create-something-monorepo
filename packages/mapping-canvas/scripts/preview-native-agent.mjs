// Interactive synthetic browser preview. No app data, grant, socket or provider.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import '../offline-agent/server.mjs';
const { createDocument } = await import('../src/lib/document.ts');
const { applyCanvasOperations } = await import('../src/lib/paired-session.ts');
const root=resolve(new URL('../build/',import.meta.url).pathname);
let document=createDocument('SYNTHETIC · native review preview'),revision=0,past=[],future=[],access={active:false},pending=[];
document.objects=[{kind:'note',id:'synthetic-note',createdAt:new Date().toISOString(),x:100,y:140,width:360,height:220,text:'Synthetic preview only.\nSelect this note, open Local agent, allow proposals, then start a reviewed session.\nNo real native grant is created.'}];
const status=()=>({sessionId:'synthetic-preview',revision,document,history:{canUndo:!!past.length,canRedo:!!future.length,depth:past.length}});
const checkpoint=()=>{past.push(structuredClone(document));future=[];};
function invoke(command,args={}){
  if(command==='draw_runtime_role')return 'host';
  if(command==='draw_host_status')return status();
  if(command==='draw_agent_status')return {...access,pending};
  if(command==='draw_agent_start'){
    access={active:true,exists:true,editIds:args.ids,socketPath:'/synthetic/no-real-socket',expiresAt:new Date(Date.now()+600000).toISOString()};
    if(args.ids.length){const object=document.objects.find(o=>args.ids.includes(o.id)&&o.kind==='note');if(object)pending=[{operationId:'mac-batch-synthetic',expectedRevision:revision,operations:[{type:'put_object',object:{...object,text:'This synthetic proposal was approved.\nUse Undo and Redo to review the shared-history UX.'}}]}];}
    return {...access,token:'synthetic-not-a-real-credential'};
  }
  if(command==='draw_agent_revoke'){access={active:false};pending=[];return access;}
  if(command==='draw_agent_review'){
    const proposal=pending.find(p=>p.operationId===args.operationId);if(!proposal)throw Error('Proposal not found');
    pending=pending.filter(p=>p!==proposal);if(!args.approve)return {status:'rejected'};
    if(proposal.expectedRevision!==revision)throw Error('Canvas changed; generate a fresh synthetic proposal.');
    checkpoint();document=applyCanvasOperations(document,proposal.operations);revision++;return {...status(),status:'applied'};
  }
  if(command==='draw_host_apply_batch'){
    if(args.request.expectedRevision!==revision)throw Error('Revision conflict');
    const before=structuredClone(document),next=applyCanvasOperations(document,args.request.operations);if(!next)throw Error('Invalid operation');
    checkpoint();document=next;revision++;return {...status(),status:'applied',previousDocument:before};
  }
  if(command==='draw_host_history'){
    if(args.expectedRevision!==revision)throw Error('Revision conflict');
    if(args.direction==='undo'){if(!past.length)throw Error('No undo');future.push(document);document=past.pop();}else{if(!future.length)throw Error('No redo');past.push(document);document=future.pop();}
    revision++;return {...status(),status:'applied'};
  }
  if(command==='draw_host_replace_document'){document=args.document;past=[];future=[];revision++;return {...status(),status:'applied'};}
  throw Error('This synthetic preview only covers native canvas and agent review controls.');
}
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/__synthetic_rpc'){
    if(req.headers.origin!==`http://127.0.0.1:${server.address().port}`){res.writeHead(403).end();return;}
    let bytes='';for await(const chunk of req){bytes+=chunk;if(bytes.length>2*1024*1024){res.writeHead(413).end();return;}}
    res.setHeader('Content-Type','application/json');try{const {command,args}=JSON.parse(bytes);res.end(JSON.stringify({result:invoke(command,args)}));}catch(e){res.end(JSON.stringify({error:e.message}));}return;
  }
  if(url.pathname==='/__synthetic_bridge.js'){res.setHeader('Content-Type','text/javascript');res.end(`window.__TAURI_INTERNALS__={invoke:async(command,args)=>{const response=await fetch('/__synthetic_rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,args})}).then(r=>r.json());if(response.error)throw Error(response.error);return response.result;}};`);return;}
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  const file=path===root?resolve(root,'index.html'):path;
  try{let bytes=await readFile(file);if(extname(file)==='.html')bytes=Buffer.from(bytes.toString().replace('<head>','<head><script src="/__synthetic_bridge.js"></script>'));
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}
});
server.listen(0,'127.0.0.1',()=>console.log(`Synthetic native UX preview: http://127.0.0.1:${server.address().port} (mock IPC; no real grants)`));
