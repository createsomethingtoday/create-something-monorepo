/** Remove one refinement while preserving route ownership and all other selections. */
export function activeRefinements(url){
 return ['styles','types','tags','free_only'].flatMap(key=>url.searchParams.getAll(key).filter(value=>value && (key!=='free_only'||value==='true')).map(value=>{
  const next=new URL(url);const remaining=next.searchParams.getAll(key).filter(item=>item!==value);
  next.searchParams.delete(key);remaining.forEach(item=>next.searchParams.append(key,item));next.searchParams.delete('page');
  return {label:key==='free_only'?'Free':value.replace(/-websites$/,'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase()),href:next.pathname+next.search+next.hash};
 }));
}
