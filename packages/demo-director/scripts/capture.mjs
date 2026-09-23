/** Called from an authorized ego-browser nodejs round with an observed Page. */
import fs from 'node:fs/promises';
import path from 'node:path';
export async function capture(page, directory, seconds, action = async () => {}) {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 120) throw Error('Capture must be 0–120 seconds');
  await fs.mkdir(directory, {recursive:false});
  const frames=[]; const start=performance.now(); let actionError;
  await page.events();
  await page.cdp('Page.startScreencast',{format:'jpeg',quality:95,maxWidth:1920,maxHeight:1080,everyNthFrame:1});
  const work=Promise.resolve().then(action).catch(e=>{actionError=e;});
  try {
    while ((performance.now()-start)/1000 < seconds) {
      for(const event of await page.events()) if(event.method==='Page.screencastFrame') {
        const {data,metadata,sessionId}=event.params;
        const file=`frame-${String(frames.length).padStart(6,'0')}.jpg`;
        await fs.writeFile(path.join(directory,file),Buffer.from(data,'base64'));
        frames.push({file,timestamp:metadata.timestamp,receivedSeconds:(performance.now()-start)/1000});
        await page.cdp('Page.screencastFrameAck',{sessionId});
      }
      await new Promise(r=>setTimeout(r,20));
    }
  } finally {
    await page.cdp('Page.stopScreencast');
    await fs.writeFile(path.join(directory,'capture.json'),JSON.stringify({version:1,seconds,frames},null,2));
  }
  await work;
  if(actionError)throw actionError;
  if(!frames.length)throw Error('No rendered frames captured');
  return {frames:frames.length,seconds,directory};
}
