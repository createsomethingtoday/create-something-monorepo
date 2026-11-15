import {load} from 'cheerio';
/** Only explicit creator-authored lists; never infer routes or capabilities. */
export function includedPageInventory(html,demoUrl){
 const $=load(html),heading=$('h1,h2,h3,h4,h5,h6,p').filter((_,e)=>/^(?:included pages|pages included|page list|page structure)\s*:?$/i.test($(e).text().trim())).first();
 if(!heading.length)return [];
 let next=heading.next();
 while(next.length&&!next.is('ul,ol')){if(next.text().trim())return [];next=next.next()}
 return next.children('li').toArray().slice(0,40).map(e=>{
  const name=$(e).text().replace(/\s+/g,' ').trim(),raw=$(e).find('a[href]').first().attr('href');let href;
  try{const base=new URL(demoUrl),u=new URL(raw||'',base);if(raw&&u.protocol==='https:'&&u.origin===base.origin&&!u.username&&!u.password)href=u.href}catch{}
  return {name,...(href?{href}:{})};
 }).filter(x=>x.name);
}
