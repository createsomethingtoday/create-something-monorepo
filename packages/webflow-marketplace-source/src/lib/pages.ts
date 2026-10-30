import {load} from 'cheerio';
import {getSecret} from 'astro:env/server';
import {readPublishedStorefront} from './creator-storefront-api.mjs';
import type {CreatorCustomization,CreatorSource} from './creator-storefront.mjs';
import assetPathMap from '../../export-path-map.json';
import {publishedCms,cmsProps,CmsNotFound} from './cms';
import {SEARCH_ORIGIN,search, type Template} from './api';
import {routeFor,localLink,searchFilters} from './routes.mjs';
import {homeMarkup,pickCreators,TILE_CATEGORIES} from './home';
const exports = import.meta.glob('../../original-export/**/*.html',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const raw=(name:string)=>exports[`../../original-export/${name}.html`];
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export interface Island {kind:'discovery'|'creator'|'cards'|'catalog'|'detail'|'widget'|'comments'|'chat'|'library';profile?:CreatorSource;published?:CreatorCustomization;total?:number;widget?:string;props?:Record<string,unknown>;items?:Template[];columns?:number;item?:Template;title?:string;description?:string;creatorSlug?:string;heroProps?:Record<string,unknown>}
export interface Page {title:string;description:string;head:string;body:string;parts:string[];islands:Island[];status:number;pageId?:string;canonical:string}
function clean(name:string){
 const $=load(raw(name)||raw('404'));
 // Archived marketing headers depend on retired custom scripts. Use the
 // current exported Marketplace navigation across all retained app pages.
 if(name!=='index'){const header=load(raw('index'))('.sb-nav-wrapper').first().toString();$('.g-nav_wrapper,.g-nav-wrapper').filter((_,element)=>$(element).parents('.g-nav_wrapper,.g-nav-wrapper').length===0).replaceWith(header);}
 $('base,script,link[rel="prefetch"],link[rel="preconnect"],link[rel="stylesheet"],meta[http-equiv],.g-nav-modal_wrap,.g-nav-js,.w-dyn-empty,.notification_bar').remove();
 $('head style').remove();
 $('[onload],[onclick],[onerror]').removeAttr('onload onclick onerror');
 $('[src],[href],[srcset]').each((_,e)=>{
  const el=$(e);
  for(const attr of ['src','href','srcset']){
   const v=el.attr(attr);if(!v)continue;
   let next=v.replace(/(?<![\w/:])(?:\.\.\/)?(images|fonts|css|js|documents)\//g,'/export/$1/');
   for(const [from,to] of Object.entries(assetPathMap))next=next.split(from).join(to);
   if(attr==='href'){
    if(/^(?!https?:|\/\/|\/)(?:[\w.-]+\/)*[\w-]+\.html(?:[?#]|$)/.test(next)){const [file,suffix='']=next.split(/(?=[?#])/);const filename=new URL(file,`https://webflow.com/templates/${name.includes('/')?name.slice(0,name.lastIndexOf('/')+1):''}`).pathname;
     const destination=filename.replace(/\.html$/,'').replace(/\/index$/,'');
     next=localLink('https://webflow.com'+destination+suffix);}
    if(next.startsWith('https://webflow.com/templates'))next=localLink(next);
   }
   el.attr(attr,next);
  }
 });
 // Finsweet accordion controls are portable native details rather than absent CDN code.
 $('[fs-accordion-element="accordion"]').each((_,element)=>{const el=$(element),trigger=el.find('[fs-accordion-element="trigger"]').first(),content=el.find('[fs-accordion-element="content"]').first();if(!trigger.length||!content.length)return;el.replaceWith('<details data-source-accordion="true" class="'+(el.attr('class')||'')+'"'+(el.attr('data-hide-initially')?' data-hide-initially="true"':'')+'><summary>'+trigger.html()+'</summary>'+content.toString()+'</details>');});
 const headingKey=(value:string)=>value.toLowerCase().replace(/^\s*\d+[.)]\s*/,'').replace(/\b(your|tool)\b/g,'').replace(/[^a-z0-9]/g,'');
 $('.link-nav-submission[href="#"]').each((index,element)=>{const link=$(element),key=headingKey(link.text());const heading=$('h2,h3').filter((_,candidate)=>headingKey($(candidate).text())===key||headingKey($(candidate).text()).startsWith(key)).first();if(!key||!heading.length)return;const id=heading.attr('id')||`source-guide-${index}`;heading.attr('id',id);link.attr('href','#'+id);});
 $('a[target="_blank"]').attr('rel','noopener noreferrer');
 $('.g-nav_menu-button').attr('aria-label','Menu');
 return $;
}
function finish($:ReturnType<typeof load>,url:URL,islands:Island[]=[],status=200):Page{
 $('.source-skip,#skip-link').remove();
 $('code-island[data-loader]').each((_,e)=>{const t=$(e).find('template').first();if(t.length)$(e).replaceWith(t.html()||'')});
 $('[id=show-cookie-preferences]').attr('href','#cookie-preferences').attr('aria-haspopup','dialog');
 $('meta[property="og:title"],meta[name="twitter:title"]').attr('content',$('title').text());
 $('meta[property="og:description"],meta[name="twitter:description"]').attr('content',$('meta[name="description"]').attr('content')||'');
 if(!$('[id=main]').length)$('body > .section').first().attr('id','main');
 const canonical='https://webflow.com'+(url.pathname==='/'?'/templates':url.pathname);
 $('head link[rel="canonical"]').remove();
 $('head meta[name="robots"]').remove();
 const body=$('body').html()||'';
 return {title:$('title').text(),description:$('meta[name="description"]').attr('content')||'',head:$('head').html()||'',body,parts:body.split(/<source-island[^>]*><\/source-island>/),islands,status,pageId:$('html').attr('data-wf-page'),canonical};
}
function shell(main:string,title:string,description='',includeCta=true){
 const $=clean('index');$('title').text(title);$('meta[name="description"]').attr('content',description);
 const header=$('.sb-nav-wrapper').first().toString(),footer=$('footer').toString(),cta=includeCta?$('.cta-sell-your-templates').toString():'';
 $('body').html(header+main+cta+footer);return $;
}
/** Published CMS category or subcategory page. Search API subcategory slugs omit the CMS "-websites" suffix. */
async function categoryCms(page:string,slug:string){
 try{return await publishedCms(`/${page}/${slug}`)}
 catch(error){
  if(error instanceof CmsNotFound&&!slug.endsWith('-websites'))return publishedCms(`/${page}/${slug}-websites`);
  throw error;
 }
}
function errorPage(url:URL,status:number){
 const title=status===404?'Page not found':'The template catalog is temporarily unavailable';
 const $=shell(`<main id="main" class="section"><div class="container"><h1>${title}</h1><p>${status===404?'This Marketplace page could not be found.':'Please try again in a moment.'}</p><div class="rd-error-actions">${status===503?`<a class="rd-control-trigger" href="${escape(url.pathname+url.search)}">Try again</a>`:''}<a href="/templates/all" data-source-back>Back to templates</a></div></div></main>`,title+' | Webflow');
 return finish($,url,[],status);
}
const names:Record<string,string>={'all':'All Website Templates','featured':'Featured Website Templates','free-website-templates':'Free Website Templates','popular-website-templates':'Popular Website Templates','new-website-templates':'New Website Templates','landing-page':'Landing Page Templates','search':'Search Website Templates','search-results':'Search Website Templates','search-v2':'Search Website Templates','basic-website-templates':'Basic Website Templates','cms-website-templates':'CMS Website Templates','ecommerce-website-templates':'Ecommerce Website Templates','premium-website-templates':'Premium Website Templates','user-accounts-website-templates':'User Accounts Website Templates'};
function hydrateCms($:ReturnType<typeof load>,islands:Island[],url?:URL){
 $('code-island').each((_,e)=>{
  const el=$(e);let widget:string,props:Record<string,unknown>;
  try{widget=JSON.parse(el.attr('data-loader')||'{}').val?.submoduleId;props=JSON.parse(el.attr('data-props')||'{}')}catch{return}
  // The published heading reads window at runtime. Give the server render the request route so the first paint carries the real title.
  if(widget==='TemplateMarketplaceHeading'&&url&&!props.staticRoutePath)props.staticRoutePath=url.pathname+url.search;
  if(['TemplateCard','TemplateGrid','TemplateFilterBar','TemplateSupportRequest','TemplateSearchSidebar','TemplateMarketplaceHeading','TemplateChat','MarketplaceAgentTools'].includes(widget)){
   islands.push({kind:'widget',widget,props});el.replaceWith('<source-island></source-island>');
  }
 });
}
export async function pageFor(url:URL):Promise<Page>{
 const route=routeFor(url.pathname);
 if(route.kind==='missing')return errorPage(url,404);
 try{
 if(route.kind==='published'){
  const cms=await publishedCms('/'+route.page+(route.slug?'/'+route.slug:''));
  const content=cms('body .section,body main,body > section').filter((_,element)=>cms(element).parents('.section,main').length===0).toArray().map(element=>cms(element).toString()).join('');
  if(!content)return errorPage(url,404);
  const $=shell(content,cms('title').text(),cms('meta[name="description"]').attr('content')||'');
  const islands:Island[]=[];hydrateCms($,islands);return finish($,url,islands);
 }
 if(route.kind==='invitation'){
  const $=clean('slack-invitation-request');
  $('form').attr('data-source-owned-form','true');
  $('#Creator-Check-Success').attr('name','Creator-Check-Success');
  $('label[for="email"],label[for="Primary-email"]').attr('for','Primary-Email');
  return finish($,url);
 }
 if(route.kind==='library'){
  const $=shell('<main id="main"><source-island></source-island></main>','Submit a Library | Webflow');
  return finish($,url,[{kind:'library'}]);
 }
 if(route.kind==='submission'){
  const $=clean('submit-a-template');
  const frame=$('#ts-submission-frame');
  const destination=new URL('https://webflow-template-form.webflow.io/submit');
  for(const key of ['section','utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const value=url.searchParams.get(key);if(value)destination.searchParams.set(key,value);}
  frame.attr('src',destination.href).attr('data-source-submission','true');
  return finish($,url);
 }
 if(route.kind==='chat'){
  const $=shell('<main id="main" class="section"><div class="container" style="height:80vh"><source-island></source-island></div></main>','Find your template | Webflow');
  return finish($,url,[{kind:'chat'}]);
 }
 if(route.kind==='service'){
  const $=clean(route.page!);
  if(route.page==='services/search-results'){const result=await search({q:url.searchParams.get('q')||url.searchParams.get('query')||'',page_size:'24',sort:'newest'});const $=shell('<main id="main" class="section"><div class="container"><source-island></source-island></div></main>','Find a template to customize | Webflow');return finish($,url,[{kind:'catalog',title:'Choose a template to customize',items:result.items}]);}
  if(route.page==='services/home'){
   const result=await search({page_size:'24',sort:'newest'});
   $('.services_tab-wrapper').replaceWith('<source-island></source-island>');
   $('.w-dyn-list').filter((_,element)=>$(element).find('.w-dyn-bind-empty').length>0).remove();
   $('form[action="/search"]').attr('action','/templates/search');
   return finish($,url,[{kind:'catalog',title:'Choose a template to customize',items:result.items}]);
  }
  if(route.page==='services/schedule'){const modal=$('[fs-modal-element="modal"]');const content=modal.find('.ts_schedule-call--help-modal').first();modal.replaceWith('<dialog class="source-support-dialog" data-source-help="true" aria-label="Template customization services">'+content.html()+'</dialog>');}
  $('form').attr('data-source-example','true');
  $('#hire-cta').attr('href','/templates/services/budget'+url.search);
  $('#budget-back').attr('href','/templates/services/service-type'+url.search);
  $('#budget-continue').removeAttr('href').attr('aria-disabled','true');
  $('#ts-calendly-embed').attr('data-source-booking','true');
  return finish($,url);
 }
 if(route.kind==='reference'){
  const $=clean(route.page!);
  if(route.page==='grading-rubric'){const cms=await publishedCms('/grading-rubric');const examples=cms('.cc-site-reference-container').first();if(examples.length)$('.cc-site-reference-container').replaceWith(examples.toString());else $('.cc-site-reference-container').remove();}
  // Reference form examples must not deliver export-placeholder submissions.
  if(route.page==='styles/components')$('form').attr('data-source-example','true');
  if(route.page==='services/component-library'){
   $('body').prepend('<aside class="source-reference-notice" role="note"><strong>Service component reference</strong><p>These are design examples. Sample template, purchase and preview controls have no destination; use <a href="/templates/services">Template customization services</a> for the working workflow.</p></aside>');
   $('a[href="#"]').each((_,element)=>{$(element).removeAttr('href').attr('aria-disabled','true').attr('data-source-example-link','true');});
  }
  if(route.page==='services/program-guidelines')$('form').attr('data-source-owned-form','true').attr('data-redirect','/templates/services/onboarding-guide').attr('redirect','/templates/services/onboarding-guide');
  return finish($,url);
 }
 if(route.kind==='home'){
  // Redesigned home: own hero, MCP row, sections and category directory;
  // keeps the exported navigation, seller CTA, FAQ and footer.
  const [featured,newest,free,pills]=await Promise.all([search({scope:'featured',sort:'newest',page_size:'7'}),search({sort:'newest',page_size:'4'}),search({scope:'free',sort:'newest',page_size:'3'}),search({page_size:'1',include:'facets,pills'})]);
  const stacks=Object.fromEntries(await Promise.all(TILE_CATEGORIES.map(async slug=>[slug,(await search({category_group_slug:slug,sort:'popular',page_size:'3'}).catch(()=>({items:[]}))).items] as const)));
  const index=clean('index');
  const faq=index('body > section.section').filter((_,element)=>/Frequently Asked Questions/i.test(index(element).text())).first().toString();
  const main=homeMarkup({total:newest.pagination.total_items,hero:featured.items.slice(4,7),creators:pickCreators(featured.items),categories:pills.category_pills||[],stacks});
  const $=shell(main+faq,'Free & Premium Website Templates | Webflow',index('meta[name="description"]').attr('content')||'');
  return finish($,url,[{kind:'cards',items:featured.items.slice(0,4)},{kind:'cards',items:free.items,columns:3},{kind:'cards',items:newest.items}]);
 }
 if(route.kind==='detail'){
  const r=await search({template_slug:route.slug!,strict:'true',page_size:'1'});
  const item=r.items.find(t=>t.template_slug===route.slug);if(!item)return errorPage(url,404);
  const $=clean('detail_html');$('title').text(`${item.name} - Website Template | Webflow`);$('meta[name="description"]').attr('content',item.description_short||'');
  const cms=await publishedCms('/html/'+route.slug);
  const rich=cms('.mp-template-text').first();
  if(!rich.length)throw new Error('CMS detail content contract changed');
  $('.mp-template-text').replaceWith(rich.toString());
  $('.template-hero').html('<div class="container"><source-island></source-island></div>');
  $('.branded-display-subtitle').text(item.description_short||'');
  $('#longDescription').removeClass('w-dyn-bind-empty');
  $('#longDescriptionOverlay,.cc_show_more_long_description').remove();
  $('.long-description').attr('style','height:auto;max-height:none');
  $('#subcategory h5').text((item.child_categories||[]).length>1?'Subcategories':'Subcategory');
  $('#subcategory .w-dyn-list').addClass('tag-list').html((item.child_categories||[]).map(t=>`<a class="tag-list_link" href="${escape(localLink(t.url))}">${escape(t.name)}</a>`).join(''));
  // CMS-only collection placeholders must never masquerade as real content.
  $('.mp-sidebar-features .w-dyn-list').each((_,e)=>{if($(e).find('.w-dyn-bind-empty').length)$(e).remove()});
  const related=cms('#marketing');
  if(related.length){
   const browse=related.find('#browseRelated');
   const destination=related.find('.util-related-category').first().attr('href');
   if(destination&&destination!=='#')browse.attr('href',localLink(destination));else if(browse.attr('href')==='#')browse.remove();
   $('#marketing').replaceWith(related.toString());
  }else $('#marketing').remove();
  const comments=$('.w-tab-pane[data-w-tab="Comments"]');
  comments.find('#disqus_thread_2').replaceWith('<source-island></source-island>');
  $('.w-dyn-bind-empty').filter((_,e)=>!$(e).text().trim()&&!$(e).attr('src')).remove();
  const islands:Island[]=[{kind:'detail',item,heroProps:cmsProps(cms,'TemplateDetailHero')}];
  if(cmsProps(cms,'TemplateSupportRequest'))$('.w-tab-pane[data-w-tab="Support"] a[href="#"]').remove();
  // Islands follow document order: hero, support, comments, related cards.
  $('source-island').first().attr('data-hero','true');
  const ordered:Island[]=[];
  $('source-island,code-island').each((_,element)=>{
   const el=$(element);
   if(el.is('source-island')){ordered.push(el.attr('data-hero')?islands[0]:{kind:'comments',item});return;}
   const holder=load(el.toString());const widgets:Island[]=[];hydrateCms(holder,widgets);if(widgets.length){ordered.push(...widgets);el.replaceWith('<source-island></source-island>');}
  });
  return finish($,url,ordered);
 }
 if(route.kind==='catalog' && (route.page==='category'||route.page==='subcategory')){
  // Production serves these from the CMS category pages: the same code components
  // plus SEO copy, "More template categories", the category FAQ and the floating template finder.
  const cms=await categoryCms(route.page,route.slug!);
  const content=cms('body').children('.section,.cta-sell-your-templates,code-island').toArray().map(e=>cms(e).toString()).join('');
  if(!cms('body > .section code-island').length)throw new Error('CMS category content contract changed');
  const $=shell(content,cms('title').text(),cms('meta[name="description"]').attr('content')||'',false);
  $('.w-dyn-empty').remove();$('.mp-main').addClass('rd-catalog-main');$('body > .section').first().addClass('rd-category-page');
  const islands:Island[]=[];hydrateCms($,islands,url);return finish($,url,islands);
 }
 if(route.kind==='catalog' && route.page==='designers' && route.slug){
  const [cms,catalog,published]=await Promise.all([
   publishedCms('/designers/'+route.slug),
   search({creator_slug:route.slug,sort:'popular',page_size:'100'}),
   readPublishedStorefront(route.slug,{origin:getSecret('CREATOR_STOREFRONT_SERVICE_URL')})
  ]);
  const header=cms('h1').first().closest('.section');
  const name=header.find('h1').text().replace(/^Templates by\s+/i,'').trim();
  if(!name)throw new Error('CMS creator profile contract changed');
  // Featured picks can be outside the first catalog page. Resolve only missing pins,
  // and recheck ownership before rendering any result from the public service.
  const existing=new Set(catalog.items.map(item=>item.template_slug));
  const missing=(published?.picks||[]).filter(pin=>!existing.has(pin.slug));
  const additional=await Promise.all(missing.map(async pin=>{
   try{
    const response=await fetch(`${SEARCH_ORIGIN}/api/templates/search?${new URLSearchParams({template_slug:pin.slug,creator_slug:route.slug!,page_size:'5'})}`,{signal:AbortSignal.timeout(2000),cache:'no-store',redirect:'manual'});
    if(!response.ok)return [];
    const data=await response.json();
    return Array.isArray(data.items)?data.items.filter((item:Template)=>item.template_slug===pin.slug&&item.creator_slug===route.slug):[];
   }catch{return [];}
  }));
  const creatorItems=[...catalog.items,...additional.flat()];
  const profile:CreatorSource={slug:route.slug,name,bio:header.find('.designer-description').text().trim(),avatar:header.find('.designer-avatar').attr('src')||'',links:header.find('a[href]').filter((_,e)=>!cms(e).parents('.mp-breadcrumbs').length).toArray().map(e=>cms(e).attr('href')||'')};
  const $=shell('<source-island></source-island>',`Website Templates by ${name} | Webflow`,profile.bio);
  return finish($,url,[{kind:'creator',profile,published:published||undefined,items:creatorItems,total:catalog.pagination.total_items}]);
 }
 if(route.kind==='catalog' && (route.page==='designers'||['basic-website-templates','cms-website-templates','ecommerce-website-templates','premium-website-templates','user-accounts-website-templates','feature','languages'].includes(route.page!))){
  const cms=await publishedCms('/'+route.page+(route.slug?'/'+route.slug:''));
  const content=cms('body > .section').toArray().map(e=>cms(e).toString()).join('');
  if(!content)throw new Error('CMS collection content contract changed');
  const $=shell(content,cms('title').text(),cms('meta[name="description"]').attr('content')||'');
  if(route.page==='designers'&&route.slug){$('h1').first().closest('.section').addClass('rd-creator-profile');}
  const islands:Island[]=[];hydrateCms($,islands,url);return finish($,url,islands);
 }
 if(route.kind==='catalog'&&['search','search-results','search-v2'].includes(route.page!)){
  const $=shell('<main id="main" class="section rd-discovery-page"><div class="container"><source-island></source-island></div></main>','Find your template | Webflow','Compare templates against your project brief.',false);
  return finish($,url,[{kind:'discovery'}]);
 }
 if(route.kind==='catalog'){
  const p=searchFilters(route,url);p.set('page_size','24');
  const data=await search(p);
  let title=names[route.page!]||'';
  if(route.slug){
   if(route.page==='designers'){
    if(!data.items.length)return errorPage(url,404);
    title=`Templates by ${data.items[0].creator_name}`;
   }else{
    const terms=[...(data.category_pills||[]),...(data.subcategory_pills||[]),...(data.available_facets?.styles||[])];
    const term=terms.find(t=>t.slug===route.slug);
    if(!term && !data.items.length)return errorPage(url,404);
    title=`${term?.name||route.slug!.replace(/-websites$/,'').replace(/-/g,' ')} Website Templates`;
   }
  }
  const $=shell('<main id="main" class="section cc-top-internal-2-2"><div class="container"><source-island></source-island></div></main>',title+' | Webflow');
  return finish($,url,[{kind:'catalog',title,items:data.items,creatorSlug:route.page==='designers'?route.slug:undefined}]);
 }
 if(route.kind==='static'){
  if(route.page==='template-licenses')return finish(clean('template-licenses'),url);
  if(['categories','tags','designers'].includes(route.page!)){
   const remote=await publishedCms('/'+route.page);
   const content=remote('body > .section').toArray().map(e=>remote(e).toString()).join('');
   if(!content)throw new Error('CMS directory content contract changed');
   const $=shell(content,remote('title').text(),remote('meta[name="description"]').attr('content')||'');
   return finish($,url);
  }
 }
 return errorPage(url,404);
 }catch(error){if(error instanceof CmsNotFound)return errorPage(url,404);console.error('[marketplace-source]',url.pathname,error);return errorPage(url,503);}
}
