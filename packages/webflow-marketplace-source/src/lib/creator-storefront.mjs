/** Creator-authored copy is distinct from marketplace-owned identity and catalog data. */
export function safeProfileUrl(value){
 if(typeof value!=='string')return '';
 try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}
}
export function safeContactUrl(value){
 const https=safeProfileUrl(value);if(https)return https;
 if(typeof value!=='string')return '';
 try{const url=new URL(value.trim());const address=decodeURIComponent(url.pathname);return url.protocol==='mailto:'&&!url.search&&!url.hash&&/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address)?url.href:''}catch{return ''}
}
export function profileLinkLabel(value){
 const url=safeProfileUrl(value);if(!url)return '';
 const host=new URL(url).hostname.replace(/^www\./,'');
 return ({'dribbble.com':'View Dribbble portfolio','behance.net':'View Behance portfolio','instagram.com':'Instagram','linkedin.com':'LinkedIn','youtube.com':'YouTube','x.com':'X','twitter.com':'X'})[host]||'Visit website';
}
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export function buildStorefront(profile,items,total,custom={}){
 const own=items.filter(item=>item.creator_slug===profile.slug);
 const bySlug=new Map(own.map(item=>[item.template_slug,item]));
 const seen=new Set();
 const pins=(Array.isArray(custom.picks)?custom.picks:[]).flatMap(pin=>{
  if(!pin||typeof pin!=='object'||!bySlug.has(pin.slug)||seen.has(pin.slug))return [];
  seen.add(pin.slug);return [{template:bySlug.get(pin.slug),note:text(pin.note,240)}];
 }).slice(0,3);
 const links=[...(profile.links||[]),custom.websiteUrl,custom.portfolioUrl].map(safeProfileUrl).filter(Boolean);
 const contact=safeContactUrl(custom.contactUrl),support=text(custom.support,400);
 return {slug:profile.slug,name:profile.name,avatar:safeProfileUrl(profile.avatar),headline:text(custom.headline,120),bio:typeof custom.bio==='string'?text(custom.bio,500):text(profile.bio,500),total:Math.max(0,Number.isFinite(total)?total:0),coverUrl:safeProfileUrl(custom.coverUrl),coverAlt:text(custom.coverAlt,240),links:[...new Set(links)].slice(0,5).map(href=>({href,label:profileLinkLabel(href)})),selectionTitle:pins.length?'Selected work':'Popular templates',selected:pins.length?pins:own.slice(0,3).map(template=>({template,note:''})),support:support&&contact?{text:support,href:contact}:null};
}
