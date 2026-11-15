import {load} from 'cheerio';
import {includedPageInventory,type IncludedPage} from './detail-content.mjs';
import {getSecret} from 'astro:env/server';
import {readPublishedStorefront} from './creator-storefront-api.mjs';
import type {CreatorCustomization,CreatorSource} from './creator-storefront.mjs';
import assetPathMap from '../../export-path-map.json';
import {publishedCms,cmsProps,CmsNotFound} from './cms';
import {SEARCH_ORIGIN,search,searchCached, type Template, type SearchResult} from './api';
import {routeFor,localLink,searchFilters} from './routes.mjs';
import {homeMarkup,categoriesMarkup,designersMarkup,pickCreators,TILE_CATEGORIES,type Designer} from './home';
const exports = import.meta.glob('../../original-export/**/*.html',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const raw=(name:string)=>exports[`../../original-export/${name}.html`];
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export interface Island {kind:'discovery'|'creator'|'cards'|'catalog'|'detail'|'widget'|'comments'|'chat'|'library';detailSection?:'hero'|'inventory'|'creator';inventory?:IncludedPage[];profile?:CreatorSource;published?:CreatorCustomization;total?:number;widget?:string;props?:Record<string,unknown>;items?:Template[];columns?:number;item?:Template;title?:string;description?:string;creatorSlug?:string;heroProps?:Record<string,unknown>}
export interface Page {title:string;description:string;head:string;body:string;parts:string[];islands:Island[];status:number;pageId?:string;canonical:string}
function clean(name:string){
 const $=load(raw(name)||raw('404'));
 // Archived marketing headers depend on retired custom scripts. Use the
 // current exported Marketplace navigation across all retained app pages.
 if(name!=='index'){const header=load(raw('index'))('.sb-nav-wrapper').first().toString();$('.g-nav_wrapper,.g-nav-wrapper').filter((_,element)=>$(element).parents('.g-nav_wrapper,.g-nav-wrapper').length===0).replaceWith(header);}
 $('base,script,link[rel="preload"][as="script"],link[rel="prefetch"],link[rel="preconnect"],link[rel="stylesheet"],meta[http-equiv],.g-nav-modal_wrap,.g-nav-js,.w-dyn-empty,.notification_bar').remove();
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
 const missing=status===404;
 const title=missing?'Page not found':'The template catalog is temporarily unavailable';
 // Error pages use the home type scale and leave out the seller call to action.
 const $=shell(`<main id="main" class="rd-home rd-error"><section class="rd-wrap" aria-labelledby="rd-error-h"><p class="rd-eyebrow">Webflow Templates</p><h1 id="rd-error-h" class="rd-h2">${title}</h1><p class="rd-lead">${missing?'This Marketplace page could not be found.':'The catalog did not respond in time. Please try again in a moment.'}</p><div class="rd-error-actions">${missing?'':`<a class="rd-btn rd-btn-primary" href="${escape(url.pathname+url.search)}">Try again</a>`}<a class="${missing?'rd-btn rd-btn-primary':'rd-text-link'}" href="/templates/all" data-source-back>Back to templates</a></div></section></main>`,title+' | Webflow','',false);
 return finish($,url,[],status);
}
// Each catalog read asks only for what its page uses. Without `include`, the catalog also
// computes facets and category pills: about six database queries where two are enough.
// CARDS is the card-sized row (name, creator, thumbnails, price) with no facets or pills.
const CARDS={include:'items',view:'grid'} as const;
// Home and the category directory share these two reads, so one cached result serves both.
const NEWEST_READ={sort:'newest',page_size:'4',...CARDS};
const PILLS_READ={page_size:'1',include:'pills'};
/** The three popular thumbnails of a category tile. category-stacks-client sends the same read. */
const stackRead=(slug:string)=>({category_group_slug:slug,sort:'popular',page_size:'3',...CARDS});
const names:Record<string,string>={'all':'All Website Templates','featured':'Featured Website Templates','free-website-templates':'Free Website Templates','popular-website-templates':'Popular Website Templates','new-website-templates':'New Website Templates','landing-page':'Landing Page Templates','search':'Search Website Templates','search-results':'Search Website Templates','search-v2':'Search Website Templates','basic-website-templates':'Basic Website Templates','cms-website-templates':'CMS Website Templates','ecommerce-website-templates':'Ecommerce Website Templates','premium-website-templates':'Premium Website Templates','user-accounts-website-templates':'User Accounts Website Templates'};
function hydrateCms($:ReturnType<typeof load>,islands:Island[],url?:URL){
 $('code-island').each((_,e)=>{
  const el=$(e);let widget:string,props:Record<string,unknown>;
  try{widget=JSON.parse(el.attr('data-loader')||'{}').val?.submoduleId;props=JSON.parse(el.attr('data-props')||'{}')}catch{return}
  // The page shell registers the WebMCP tools once for every route.
  if(widget==='MarketplaceAgentTools'){el.remove();return;}
  // The published heading reads window at runtime. Give the server render the request route so the first paint carries the real title.
  if(widget==='TemplateMarketplaceHeading'&&url&&!props.staticRoutePath)props.staticRoutePath=url.pathname+url.search;
  // CMS cards say "$59 USD" and the catalog grid says "59 USD". Cards use the grid's wording on every page.
  if(widget==='TemplateCard'&&typeof props.price==='string'){const amount=props.price.match(/^\$?\s*(\d+(?:\.\d+)?)(?:\s*USD)?$/i);if(amount)props.price=`${amount[1]} USD`;}
  if(['TemplateCard','TemplateGrid','TemplateFilterBar','TemplateSupportRequest','TemplateSearchSidebar','TemplateMarketplaceHeading','TemplateChat'].includes(widget)){
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
  // The catalog island reads its own results in the browser, so these routes make no server catalog read.
  if(route.page==='services/search-results'){const $=shell('<main id="main" class="section"><div class="container"><source-island></source-island></div></main>','Find a template to customize | Webflow');return finish($,url,[{kind:'catalog',title:'Choose a template to customize'}]);}
  if(route.page==='services/home'){
   $('.services_tab-wrapper').replaceWith('<source-island></source-island>');
   $('.w-dyn-list').filter((_,element)=>$(element).find('.w-dyn-bind-empty').length>0).remove();
   $('form[action="/search"]').attr('action','/templates/search');
   return finish($,url,[{kind:'catalog',title:'Choose a template to customize'}]);
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
  // No catalog read is required. When one fails, its sections are left out and the rest of the
  // home page still renders; the hero search and category links need no catalog read at all.
  const none:SearchResult={items:[],pagination:{total_items:0,total_pages:0,page:1},category_pills:[],subcategory_pills:[]};
  const soft=(read:Promise<SearchResult>)=>read.catch(error=>{console.error('[marketplace-source] home section left out:',error instanceof Error?error.message:error);return none});
  const [featured,newest,free,pills]=await Promise.all([soft(search({scope:'featured',sort:'newest',page_size:'7',...CARDS})),soft(search(NEWEST_READ)),soft(search({scope:'free',sort:'newest',page_size:'3',...CARDS})),soft(search(PILLS_READ))]);
  // Category stacks never hold up the page: seven popular-sort reads on a cold render overloaded
  // the catalog database. A stack this server already holds renders inline; the rest load in the
  // browser as their tiles come near, through the same cache.
  const stacks=Object.fromEntries(await Promise.all(TILE_CATEGORIES.map(async slug=>[slug,(await searchCached(stackRead(slug))?.catch(()=>undefined))?.items||[]] as const)));
  const index=clean('index');
  const faqSection=index('body > section.section').filter((_,element)=>/Frequently Asked Questions/i.test(index(element).text())).first();
  // The exported FAQ joins the home type scale and sentence case.
  faqSection.addClass('rd-faq').find('h2').first().addClass('rd-h3').text('Frequently asked questions');
  const faq=faqSection.toString();
  const main=homeMarkup({total:newest.pagination.total_items,hero:featured.items.slice(4,7),creators:pickCreators(featured.items),categories:pills.category_pills||[],stacks,featured:featured.items.length>0,free:free.items.length>0,fresh:newest.items.length>0});
  const $=shell(main+faq,'Free & Premium Website Templates | Webflow',index('meta[name="description"]').attr('content')||'');
  // One island for each card section that homeMarkup rendered, in document order.
  const islands:Island[]=[];
  if(featured.items.length)islands.push({kind:'cards',items:featured.items.slice(0,4)});
  if(free.items.length)islands.push({kind:'cards',items:free.items,columns:3});
  if(newest.items.length)islands.push({kind:'cards',items:newest.items});
  return finish($,url,islands);
 }
 if(route.kind==='detail'){
  const r=await search({template_slug:route.slug!,strict:'true',page_size:'1',include:'items'});
  const item=r.items.find(t=>t.template_slug===route.slug);if(!item)return errorPage(url,404);
  const $=clean('detail_html');$('title').text(`${item.name} - Website Template | Webflow`);$('meta[name="description"]').attr('content',item.description_short||'');
  const [cms,published]=await Promise.all([publishedCms('/html/'+route.slug),readPublishedStorefront(item.creator_slug,{origin:getSecret('CREATOR_STOREFRONT_SERVICE_URL'),timeoutMs:1200})]);
  const rich=cms('.mp-template-text').first();
  if(!rich.length)throw new Error('CMS detail content contract changed');
  rich.find('p').filter((_,e)=>!cms(e).text().trim()&&!cms(e).find('img,video,iframe').length).remove();
  $('.mp-template-text').replaceWith(rich.toString());
  $('.template-hero').addClass('rd-detail-hero').html('<div class="container"><source-island></source-island></div>');
  $('.branded-display-subtitle').remove();
  $('.mp-sidebar-features').addClass('rd-detail-sidebar');
  $('.mp-sidebar-wrap').filter((_,e)=>$(e).find('h5').text().trim()==='Share').remove();
  $('#longDescription').removeClass('w-dyn-bind-empty');
  // Production collapses long descriptions behind Show more; description-client owns the toggle.
  // Hidden until the client measures overflow, so the full text stays readable without JS.
  $('#longDescriptionOverlay,.cc_show_more_long_description').remove();
  $('.long-description').removeAttr('style').append('<div id="longDescriptionOverlay" class="cc-long-description-overlay" aria-hidden="true" style="display:none"></div>')
   .after(`<div class="cc_show_more_long_description" style="display:none"><button type="button" id="showMoreDescription" class="button-sp cc-white" aria-controls="longDescription" aria-expanded="false" data-template-name="${escape(item.name)}">Show more</button></div>`);
  $('#subcategory h5').text((item.child_categories||[]).length>1?'Subcategories':'Subcategory');
  $('#subcategory .w-dyn-list').addClass('tag-list').html((item.child_categories||[]).map(t=>`<a class="tag-list_link" href="${escape(localLink(t.url))}">${escape(t.name)}</a>`).join(''));
  // CMS-only collection placeholders must never masquerade as real content.
  $('.mp-sidebar-features .w-dyn-list').each((_,e)=>{if($(e).find('.w-dyn-bind-empty').length)$(e).remove()});
  const related=cms('#marketing');
  if(related.length){
   const browse=related.find('#browseRelated');
   const destination=related.find('.util-related-category').first().attr('href');
   if(destination&&destination!=='#')browse.attr('href',localLink(destination));else if(browse.attr('href')==='#')browse.remove();
   // Production hides empty related sections with page scripts, which clean() strips.
   related.find('.more-templates-container').filter((_,e)=>cms(e).find('.w-dyn-empty').length>0&&!cms(e).find('.w-dyn-item').length).remove();
   $('#marketing').replaceWith(related.toString());
  }else $('#marketing').remove();
  const comments=$('.w-tab-pane[data-w-tab="Comments"]');
  comments.find('#disqus_thread_2').replaceWith('<source-island></source-island>');
  $('.w-dyn-bind-empty').filter((_,e)=>!$(e).text().trim()&&!$(e).attr('src')).remove();
  const islands:Island[]=[{kind:'detail',item,published:published||undefined,inventory:includedPageInventory(rich.html()||'',item.website_url),heroProps:cmsProps(cms,'TemplateDetailHero')}];
  if(cmsProps(cms,'TemplateSupportRequest'))$('.w-tab-pane[data-w-tab="Support"] a[href="#"]').remove();
  // Islands follow document order: hero, support, comments, related cards.
  $('source-island').first().attr('data-hero','true');
  $('.mp-template-text-wrap').first().prepend('<source-island data-detail-section="inventory"></source-island>');
  $('.mp-sidebar-features').first().prepend('<source-island data-detail-section="creator"></source-island>');
  $('.mp-template-text').first().addClass('rd-detail-columns').closest('.section').addClass('rd-detail-content-section');
  const ordered:Island[]=[];
  $('source-island,code-island').each((_,element)=>{
   const el=$(element);
   if(el.is('source-island')){ordered.push(el.attr('data-detail-section')?{...islands[0],detailSection:el.attr('data-detail-section') as 'inventory'|'creator'}:el.attr('data-hero')?islands[0]:{kind:'comments',item});return;}
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
   search({creator_slug:route.slug,sort:'popular',page_size:'100',include:'items'}),
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
  let title=names[route.page!]||'';
  // The catalog island reads its own results in the browser. The server reads the catalog only
  // to name a term route and to confirm that it exists.
  if(route.slug){
   const p=searchFilters(route,url);p.set('page_size','1');
   const data=await search(p);
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
  return finish($,url,[{kind:'catalog',title,creatorSlug:route.page==='designers'?route.slug:undefined}]);
 }
 if(route.kind==='static'){
  if(route.page==='template-licenses')return finish(clean('template-licenses'),url);
  if(route.page==='categories'){
   // Redesigned directory: search API counts; the CMS supplies titles, meta and card descriptions.
   // The pills read reports zero totals, so the count comes from the same newest read as home.
   const [remote,pills,newest]=await Promise.all([publishedCms('/categories'),search(PILLS_READ),search(NEWEST_READ)]);
   const categories=pills.category_pills||[];
   const descriptions:Record<string,string>={};
   remote('a.categoryc-card_link').each((_,e)=>{const slug=(remote(e).attr('href')||'').split('/').pop()!;descriptions[slug]=remote(e).find('.u-text-gray600').first().text().trim();});
   const $=shell(categoriesMarkup({total:newest.pagination.total_items,categories,descriptions}),remote('title').text()||'All template categories | Webflow',remote('meta[name="description"]').attr('content')||'');
   return finish($,url);
  }
  if(route.page==='designers'){
   // Redesigned directory. The CMS list shows 100 creators per page behind an infinite-load
   // script that the bridge strips, so every page is read. The search API supplies popular creators,
   // and new creators: those with recent templates, newest CMS record first.
   const empty={items:[] as Template[]};
   const [first,popular,newest]=await Promise.all([publishedCms('/designers'),search({sort:'popular',page_size:'48',...CARDS}).catch(()=>empty),search({sort:'newest',page_size:'100',...CARDS}).catch(()=>empty)]);
   const pageKey=(first('.w-pagination-next').attr('href')||'').match(/[a-z0-9]+_page/)?.[0];
   const pages=Number(first('.w-page-count').first().text().split('/')[1])||1;
   const rest=pageKey?await Promise.all(Array.from({length:pages-1},(_,i)=>publishedCms(`/designers?${pageKey}=${i+2}`))):[];
   const designers=new Map<string,Designer>();
   for(const remote of [first,...rest])remote('a.designer-card_content-wrap').each((_,e)=>{
    const slug=(remote(e).attr('href')||'').split('/').pop()!,name=remote(e).text().trim();
    const id=decodeURIComponent(remote(e).attr('data-wf-cms-context')||'').match(/"itemId":"([0-9a-f]{24})"/)?.[1]||'';
    if(slug&&name)designers.set(slug,{id,slug,name,avatar:remote(e).find('img').attr('src')||''});
   });
   if(!designers.size)throw new Error('CMS directory content contract changed');
   const top=pickCreators(popular.items,4),shown=new Set(top.map(t=>t.creator_slug));
   const joined=pickCreators(newest.items,100).filter(t=>!shown.has(t.creator_slug)&&designers.get(t.creator_slug)?.id).sort((a,b)=>designers.get(b.creator_slug)!.id.localeCompare(designers.get(a.creator_slug)!.id)).slice(0,4);
   const $=shell(designersMarkup({designers:[...designers.values()],popular:top,newest:joined}),first('title').text()||'Template creators | Webflow',first('meta[name="description"]').attr('content')||'');
   return finish($,url);
  }
  if(route.page==='tags'){
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
