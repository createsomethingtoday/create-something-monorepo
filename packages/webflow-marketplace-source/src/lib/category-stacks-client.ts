/** Fill category tile stacks marked data-rd-stack with three popular thumbnails.
 *  A stack loads when its tile comes near the viewport, two reads at a time, so a directory
 *  of 26 tiles never sends 26 popular-sort reads at once. A failed read retries twice with a
 *  pause, which also holds its place in the queue while the catalog recovers. A tile that
 *  still has no thumbnails keeps its blank cards. Thumbnails are kept for the session. */
const KEY='rd-stack:',ACTIVE=2,RETRY_MS=[1500,4000],FADE_MS=500;
const cached=(slug:string)=>{try{const urls=JSON.parse(sessionStorage.getItem(KEY+slug)||'null');return Array.isArray(urls)&&urls.length?urls as string[]:null}catch{return null}};
const keep=(slug:string,urls:string[])=>{try{sessionStorage.setItem(KEY+slug,JSON.stringify(urls))}catch{/* Storage is unavailable: the next page loads the stack again. */}};

// The thumbnails are added over the blank cards once they have decoded, and the blanks
// leave after the fade, so the tile never shows an empty frame.
async function paint(stack:HTMLElement,urls:string[]){
 const imgs=urls.slice(0,3).map((src,i)=>{const img=new Image();img.alt='';img.style.setProperty('--i',String(i-1));img.src=src;return img});
 await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));
 const ready=imgs.filter(img=>img.naturalWidth>0);
 if(!ready.length||!stack.isConnected){stack.dataset.rdStackState='failed';return}
 const blanks=[...stack.children];
 stack.append(...ready);
 stack.dataset.rdStackState='ready';
 setTimeout(()=>blanks.forEach(blank=>blank.remove()),FADE_MS);
}

async function load(stack:HTMLElement,attempt=0):Promise<void>{
 const slug=stack.dataset.rdStack!;
 stack.dataset.rdStackState='loading';
 try{
  const response=await fetch(`/templates-api/api/templates/search?${new URLSearchParams({category_group_slug:slug,sort:'popular',page_size:'3'})}`);
  if(!response.ok)throw new Error(String(response.status));
  const {items=[]}=await response.json() as {items?:{thumbnail_image_url:string}[]};
  const urls=items.slice(0,3).map(t=>t.thumbnail_image_url).filter(Boolean);
  if(!urls.length){stack.dataset.rdStackState='failed';return}
  keep(slug,urls);
  await paint(stack,urls);
 }catch{
  if(attempt<RETRY_MS.length){await new Promise(resolve=>setTimeout(resolve,RETRY_MS[attempt]));return load(stack,attempt+1)}
  stack.dataset.rdStackState='failed';
 }
}

export function initCategoryStacks(){
 const stacks=[...document.querySelectorAll<HTMLElement>('[data-rd-stack]')];
 if(!stacks.length)return;
 const queue:HTMLElement[]=[];let active=0;
 const next=()=>{while(active<ACTIVE&&queue.length){active++;load(queue.shift()!).finally(()=>{active--;next()})}};
 const near=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const stack=entry.target as HTMLElement;
   near.unobserve(stack);
   const urls=cached(stack.dataset.rdStack!);
   if(urls)paint(stack,urls);else{queue.push(stack);next()}
  }
 },{rootMargin:'400px 0px'});
 stacks.forEach(stack=>near.observe(stack));
}
