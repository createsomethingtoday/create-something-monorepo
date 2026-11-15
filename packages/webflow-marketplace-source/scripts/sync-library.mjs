import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const owner=resolve(process.env.LIBRARY_SOURCE_DIR||'../../../webflow-library-submission-form');
const files=['components/library-intake.tsx','components/country-picker.tsx','lib/intake/constants.ts'];
const manifest={source:'webflow-library-submission-form',files:{},transforms:['Next Script to portable loader','API paths to disabled development adapter','build-time Turnstile unset for dev preview']};
for(const file of files){let source=await readFile(resolve(owner,file),'utf8');manifest.files[file]=createHash('sha256').update(source).digest('hex');
 if(file==='components/library-intake.tsx')source=source.replace("from 'next/script'","from '../../../components/ExternalScript'").replace("process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''","''");
 if(file==='components/library-intake.tsx')source=source.replace(/declare global \{\s*interface Window \{\s*turnstile\?: TurnstileApi;\s*\}\s*\}/,'').replaceAll('window.turnstile','(window as unknown as {turnstile:TurnstileApi}).turnstile');
 const target=resolve('src/vendor/library',file);await mkdir(dirname(target),{recursive:true});await writeFile(target,source);
}
const css=await readFile(resolve(owner,'app/globals.css'),'utf8');manifest.files['app/globals.css']=createHash('sha256').update(css).digest('hex');await writeFile('public/library-intake.css',css.replace("@import './vendor/webflow-template-marketplace.shared.css';",''));
await writeFile('src/vendor/library/lib/runtime-paths.ts',"/** Development-only preview; production uses the authoritative embedded app. */\nexport const appPath=(path:string)=>'/library-preview-api'+path;\n");
await writeFile('library-snapshot.json',JSON.stringify(manifest,null,2)+'\n');
