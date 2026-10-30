// One URL contract shared by the brief, catalog and agent page actions.
export function readBrief(search='') {
 const p=new URLSearchParams(search),raw=p.get('max_price');
 return {portfolioKind:['all','designer','photographer','developer','studio'].includes(p.get('portfolio_kind'))?p.get('portfolio_kind'):'',q:(p.get('q')||p.get('query')||'').slice(0,256),notes:(p.get('brief')||'').slice(0,1000),maxPrice:raw!==null&&/^\d+(?:\.\d{1,2})?$/.test(raw)&&Number(raw)<=100000?raw:'',cms:['true','false'].includes(p.get('has_cms'))?p.get('has_cms'):'',free:p.get('free_only')==='true',category:p.get('category')||p.get('category_group_slug')||'',style:p.getAll('styles').join(',')||p.get('style')||'',types:p.getAll('types').join(',')};
}
export function briefParams(brief,current=''){
 const p=new URLSearchParams(current);
 for(const key of ['portfolio_kind','q','query','search','brief','max_price','has_cms','cms','free_only','free','pricing','category','category_group_slug','styles','style','types','page'])p.delete(key);
 for(const [key,value] of [['portfolio_kind',brief.portfolioKind||''],['q',brief.q.trim()],['brief',brief.notes.trim()],['max_price',brief.maxPrice],['has_cms',brief.cms],['category',brief.category],['styles',brief.style],['types',brief.types]])if(value!=='')p.set(key,value);
 if(brief.free)p.set('free_only','true');return p;
}
export function discoveryQuery(search){
 const p=new URLSearchParams(search);p.delete('brief');p.delete('compare');p.delete('mode');
 if(p.has('category')){p.set('category_group_slug',p.get('category'));p.delete('category')}
 p.set('page_size','24');p.set('view','full');p.set('include','items');p.set('strict','true');p.set('discovery','true');if(!p.has('sort'))p.set('sort','recommended');return p;
}
export function priceLabel(item){return item.is_free||item.price===0?'Free':typeof item.price==='number'&&Number.isFinite(item.price)?`$${item.price} USD`:'Price not confirmed'}
export function cmsLabel(item){return item.has_cms===true?'CMS included':item.has_cms===false?'No CMS':'CMS not confirmed'}
export function evidenceFor(item,brief,currentMatch=false){
 const facts=[{label:'Template price',value:priceLabel(item)},{label:'CMS capability',value:cmsLabel(item)}];
 const categories=(item.child_categories?.length?item.child_categories:item.category_groups||[]).map(x=>x.name).join(', ');
 if(categories)facts.push({label:'Catalog category',value:categories});
 if(item.styles?.length)facts.push({label:'Catalog styles',value:item.styles.map(x=>x.name).join(', ')});
 const reasons=[];
 if(brief.maxPrice!==''&&(item.is_free||(typeof item.price==='number'&&item.price<=Number(brief.maxPrice))))reasons.push(`Within your $${brief.maxPrice} template budget`);
 if(brief.cms==='true'&&item.has_cms===true)reasons.push('Includes the CMS capability you require');
 if(brief.free&&item.is_free)reasons.push('Available as a free template');
 if(categories&&currentMatch)reasons.push(`Listed in ${categories}`);
 if(brief.maxPrice!==''&&typeof item.price==='number'&&item.price>Number(brief.maxPrice)&&!item.is_free)reasons.push('Exceeds your current template budget');
 if(brief.cms==='true'&&item.has_cms===false)reasons.push('Does not meet your CMS requirement');
 if(!reasons.length)reasons.push(currentMatch?'A starting point from the current catalog order':'Recheck this saved template against your current brief');
 const limit=item.has_cms===null||item.has_cms===undefined?'CMS capability is not confirmed. Check the template details before choosing.':item.has_cms===false?'No CMS is included. Dynamic content would need additional setup.':'CMS is included; the collection structure may still need adapting to your project.';
 return {facts,reasons,limit};
}
export function comparisonSlugs(search){return [...new Set((new URLSearchParams(search).get('compare')||'').split(',').filter(s=>/^[a-z0-9][a-z0-9-]{0,199}$/.test(s)))].slice(0,3)}
