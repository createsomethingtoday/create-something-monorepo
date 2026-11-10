// Run with ego-browser in a parent-owned space; this script never creates or finishes one.
// globalThis.PAPER_RELEASE = {spaceId, baseURL, output};
const fs=await import('node:fs/promises');
const cfg=globalThis.PAPER_RELEASE;
if(!cfg || !Number.isInteger(cfg.spaceId) || !cfg.baseURL || !cfg.output) throw new Error('Provide PAPER_RELEASE with existing spaceId, baseURL and absolute output directory');
await fs.mkdir(cfg.output,{recursive:true});
const p=(await taskSpace(cfg.spaceId)).page('p1');
const report={baseURL:cfg.baseURL,checks:[],layouts:[],failures:[]};
function check(name,pass,detail){report.checks.push({name,pass,detail});if(!pass)report.failures.push(name);}
await p.cdp('Network.enable');await p.cdp('Network.setCacheDisabled',{cacheDisabled:true});
await p.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await p.goto(cfg.baseURL+'/#paper-example-title');
await p.waitForSelector('.paper-example.enhanced');
await p.evaluate(()=>document.fonts.ready.then(()=>true));
for(const width of [320,390,680,768,1024,1025,1440]){
 await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:2400,deviceScaleFactor:1,mobile:false});
 await p.goto(cfg.baseURL+'/?paper-check='+width+'#paper-example-title');await p.waitForSelector('.paper-example.enhanced');await p.evaluate(()=>document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
 for(const stage of ['plan','test','run']){
  console.log('Checking '+width+'/'+stage);
  await p.click(`.paper-example [data-select="${stage}"]`);
  const row=await p.evaluate(()=>{
   const r=document.querySelector('.paper-example'),f=r.querySelector('form'),css=getComputedStyle(f);
   return {width:innerWidth,stage:r.querySelector('.mat').dataset.stage,overflow:document.documentElement.scrollWidth>innerWidth,
    clipped:[...r.querySelectorAll('.sheet')].filter(n=>n.offsetParent).some(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1),
    targets:[...r.querySelectorAll('button')].filter(n=>n.offsetParent).every(n=>n.getBoundingClientRect().height>=44),
    enabled:!r.querySelector('fieldset').disabled,added:[...r.querySelectorAll('.added')].every(n=>!n.hidden),forms:r.querySelectorAll('form').length,
    agent:r.querySelector('#paper-agent-role').textContent,team:r.querySelector('#paper-team-role').textContent,
    formPadding:parseFloat(css.padding),formBackground:css.backgroundColor,inputBorder:getComputedStyle(r.querySelector('input')).borderColor,
    buttonOpacity:getComputedStyle(r.querySelector('.preview-button')).opacity,settled:!f.style.height};
  });
  report.layouts.push(row);
  check(`${width}/${stage}`,row.width===width&&!row.overflow&&!row.clipped&&row.targets&&row.stage===stage&&row.enabled===(stage==='run')&&row.added===(stage!=='plan')&&row.forms===1&&row.agent.length>20&&row.team.length>20&&row.formPadding>=12&&row.formBackground==='rgb(250, 250, 247)'&&row.inputBorder!=='rgb(255, 255, 255)'&&row.buttonOpacity==='1'&&row.settled,row);
  if([320,768,1440].includes(width)){
   await p.evaluate(()=>{const r=document.querySelector('.paper-example').getBoundingClientRect();window.scrollTo(0,scrollY+r.top-90);});
   await p.screenshot({path:`${cfg.output}/${width}-${stage}.png`});
  }
 }
 if([390,1440].includes(width))await p.screenshot({path:`${cfg.output}/full-page-${width}.png`,fullPage:true});
}
await p.click('.paper-example .preview-button');
check('Native required values block empty submit',await p.evaluate(()=>!document.querySelector('#paper-request-form').checkValidity()&&document.querySelector('#paper-confirmation').hidden));
await p.fill('#paper-request-name','Alex Example');await p.fill('#paper-request-email','not-an-email');await p.selectOption('#paper-request-type',{label:'Connect our tools'});await p.fill('#paper-request-brief','Route incoming requests to the right person.');
await p.click('.paper-example .preview-button');check('Native email validation',await p.evaluate(()=>document.querySelector('#paper-request-email').validity.typeMismatch&&document.querySelector('#paper-confirmation').hidden));
await p.fill('#paper-request-email','alex@example.com');await p.focus('.paper-example .preview-button');await p.keyboard.press('Enter');
check('Keyboard local preview and focus',await p.evaluate(()=>{const s=document.querySelector('#paper-confirmation');return !s.hidden&&s.textContent.includes('Alex Example')&&s.textContent.includes('Connect our tools')&&s.textContent.includes('Nothing was sent or saved')&&document.activeElement===s;}));
check('Local summary text contrast',await p.evaluate(()=>{const box=document.querySelector('#paper-confirmation');const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};const bg=luminance(getComputedStyle(box).backgroundColor);return [...box.querySelectorAll('p,strong')].every(n=>{const fg=luminance(getComputedStyle(n).color);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)>=4.5})}));
await p.fill('#paper-request-brief','   ');await p.click('.paper-example .preview-button');check('Whitespace rejected and prior preview hidden',await p.evaluate(()=>!document.querySelector('#paper-request-brief').validity.valid&&document.querySelector('#paper-confirmation').hidden));
await p.fill('#paper-request-brief','<img src=x onerror=alert(1)> is shown as text.');await p.click('.paper-example .preview-button');check('Edits recover and preview treats values as text',await p.evaluate(()=>document.querySelector('#paper-request-form').checkValidity()&&!document.querySelector('#paper-confirmation img')&&document.querySelector('#paper-confirmation').textContent.includes('<img')));
await p.focus('.paper-example [data-select="test"]');await p.keyboard.press('Enter');check('Keyboard stage and focus ring',await p.evaluate(()=>document.querySelector('.paper-example .mat').dataset.stage==='test'&&document.activeElement.dataset.select==='test'&&getComputedStyle(document.activeElement).outlineStyle!=='none'));
await p.click('.paper-example [data-select="run"]');check('Values survive stage changes',await p.evaluate(()=>document.querySelector('#paper-request-email').value==='alex@example.com'));
check('Existing chapter team terms and CTA preserved',await p.evaluate(()=>{const h=document.querySelector('#together');return h.querySelector('.paper-example')&&h.textContent.includes('Huzaifa')&&h.textContent.includes('After full payment')&&document.querySelector('#next a.button').getAttribute('href')==='/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure'&&document.querySelectorAll('h1').length===1;}));
await p.cdp('Emulation.setScriptExecutionDisabled',{value:true});await p.goto(cfg.baseURL+'/?paper-check=no-js#paper-example-title');
const snap=await p.snapshot({scope:'full_page'});
check('No-JS complete process and agent narrative',snap.includes('Agents support building, checks and deployment')&&snap.includes('Talk through your project')&&!snap.includes('Explore the design stages'));
await p.screenshot({path:`${cfg.output}/no-js.png`});
await p.cdp('Emulation.setScriptExecutionDisabled',{value:false});await p.reload();
await fs.writeFile(`${cfg.output}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({checks:report.checks.length,layouts:report.layouts.length,failures:report.failures}));
