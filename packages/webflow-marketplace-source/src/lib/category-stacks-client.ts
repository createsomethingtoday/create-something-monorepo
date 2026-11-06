/** Fill category tile stacks marked data-rd-stack with three popular thumbnails. */
export function initCategoryStacks(){
 document.querySelectorAll<HTMLElement>('[data-rd-stack]').forEach(async stack=>{
  const params=new URLSearchParams({category_group_slug:stack.dataset.rdStack!,sort:'popular',page_size:'3'});
  try{
   const response=await fetch(`/templates-api/api/templates/search?${params}`);
   if(!response.ok)return;
   const {items=[]}=await response.json() as {items?:{thumbnail_image_url:string}[]};
   stack.innerHTML=items.slice(0,3).map((t,i)=>`<img src="${encodeURI(t.thumbnail_image_url)}" alt="" loading="lazy" style="--i:${i-1}">`).join('');
  }catch{/* The tile keeps its empty frame. */}
 });
}
