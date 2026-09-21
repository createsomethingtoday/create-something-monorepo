import {load} from 'cheerio';
import {publishedCms,cmsProps,CmsNotFound} from './cms';
import {search, type Template} from './api';
import {routeFor,localLink,searchFilters} from './routes.mjs';
const exports = import.meta.glob('../../original-export/*.html',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const raw=(name:string)=>exports[`../../original-export/${name}.html`];
const escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export interface Island {kind:'cards'|'catalog'|'detail'|'widget';widget?:string;props?:Record<string,unknown>;items?:Template[];item?:Template;title?:string;description?:string;creatorSlug?:string;heroProps?:Record<string,unknown>}
export interface Page {title:string;description:string;head:string;body:string;parts:string[];islands:Island[];status:number;pageId?:string;canonical:string}
function clean(name:string){
 const $=load(raw(name)||raw('404'));
 $('script,link[rel="prefetch"],link[rel="preconnect"],link[rel="stylesheet"],meta[http-equiv],.g-nav-modal_wrap,.g-nav-js,.w-dyn-empty,.notification_bar').remove();
 $('head style').remove();
 $('[onload],[onclick],[onerror]').removeAttr('onload onclick onerror');
 $('[src],[href],[srcset]').each((_,e)=>{
  const el=$(e);
  for(const attr of ['src','href','srcset']){
   const v=el.attr(attr);if(!v)continue;
   let next=v.replace(/(?<![\w/:])(?:\.\.\/)?(images|fonts|css|js|documents)\//g,'/export/$1/');
   if(attr==='href'){
    if(/^[\w-]+\.html(?:[?#]|$)/.test(next)){const [file,suffix='']=next.split(/(?=[?#])/);next=file==='index.html'?'/templates'+suffix:'/templates/'+file.replace(/\.html$/,'')+suffix;}
    if(next.startsWith('https://webflow.com/templates'))next=localLink(next);
   }
   el.attr(attr,next);
  }
 });
 $('a[target="_blank"]').attr('rel','noopener noreferrer');
 $('.g-nav_menu-button').attr('aria-label','Menu');
 return $;
}
function finish($:ReturnType<typeof load>,url:URL,islands:Island[]=[],status=200):Page{
 $('.source-skip,#skip-link').remove();
 $('code-island[data-loader]').each((_,e)=>{const t=$(e).find('template').first();if(t.length)$(e).replaceWith(t.html()||'')});
 $('[id=show-cookie-preferences]').attr('href','https://webflow.com/legal/cookie-policy');
 $('meta[property="og:title"],meta[name="twitter:title"]').attr('content',$('title').text());
 $('meta[property="og:description"],meta[name="twitter:description"]').attr('content',$('meta[name="description"]').attr('content')||'');
 if(!$('[id=main]').length)$('body > .section').first().attr('id','main');
 const canonical='https://webflow.com'+(url.pathname==='/'?'/templates':url.pathname);
 $('head link[rel="canonical"]').remove();
 $('head meta[name="robots"]').remove();
 const body=$('body').html()||'';
 return {title:$('title').text(),description:$('meta[name="description"]').attr('content')||'',head:$('head').html()||'',body,parts:body.split(/<source-island[^>]*><\/source-island>/),islands,status,pageId:$('html').attr('data-wf-page'),canonical};
}
function shell(main:string,title:string,description=''){
 const $=clean('index');$('title').text(title);$('meta[name="description"]').attr('content',description);
 const header=$('.sb-nav-wrapper').first().toString(),footer=$('footer').toString(),cta=$('.cta-sell-your-templates').toString();
 $('body').html(header+main+cta+footer);return $;
}
function errorPage(url:URL,status:number){
 const title=status===404?'Page not found':'The template catalog is temporarily unavailable';
 const $=shell(`<main id="main" class="section"><div class="container"><h1>${title}</h1><p>${status===404?'This Marketplace page could not be found.':'Please try again in a moment.'}</p><a href="/templates/all">Browse all templates</a></div></main>`,title+' | Webflow');
 return finish($,url,[],status);
}
const names:Record<string,string>={'all':'All Website Templates','featured':'Featured Website Templates','free-website-templates':'Free Website Templates','popular-website-templates':'Popular Website Templates','new-website-templates':'New Website Templates','landing-page':'Landing Page Templates','search':'Search Website Templates','search-results':'Search Website Templates','search-v2':'Search Website Templates','basic-website-templates':'Basic Website Templates','cms-website-templates':'CMS Website Templates','ecommerce-website-templates':'Ecommerce Website Templates','premium-website-templates':'Premium Website Templates','user-accounts-website-templates':'User Accounts Website Templates'};
function hydrateCms($:ReturnType<typeof load>,islands:Island[]){
 $('code-island').each((_,e)=>{
  const el=$(e);let widget:string,props:Record<string,unknown>;
  try{widget=JSON.parse(el.attr('data-loader')||'{}').val?.submoduleId;props=JSON.parse(el.attr('data-props')||'{}')}catch{return}
  if(['TemplateCard','TemplateGrid','TemplateFilterBar'].includes(widget)){
   islands.push({kind:'widget',widget,props});el.replaceWith('<source-island></source-island>');
  }
 });
}
export async function pageFor(url:URL):Promise<Page>{
 const route=routeFor(url.pathname);
 if(route.kind==='missing')return errorPage(url,404);
 try{
 if(route.kind==='home'){
  const $=clean('index');$('.starter_templates').remove();
  const result=await Promise.all([search({scope:'featured',sort:'newest',page_size:'8'}),search({sort:'newest',page_size:'8'}),search({scope:'free',sort:'newest',page_size:'8'})]);
  // The exported Featured block has an id instead of a dedicated class.
  const featured=$('#featured');featured.replaceWith('<source-island></source-island>');
  $('.new_templates .w-dyn-list,.free_templates .w-dyn-list').replaceWith('<source-island></source-island>');
  $('.search-wrap input').wrap('<form action="/templates/search" method="get" role="search"></form>').attr('aria-label','Search templates').attr('name','q');
  $('body > .section').first().attr('id','main');
  return finish($,url,result.map(r=>({kind:'cards',items:r.items})));
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
  $('#subcategory .w-dyn-list').html((item.child_categories||[]).map(t=>`<a class="tag-list_link" href="${escape(localLink(t.url))}">${escape(t.name)}</a>`).join(''));
  // CMS-only collection placeholders must never masquerade as real content.
  $('.mp-sidebar-features .w-dyn-list').each((_,e)=>{if($(e).find('.w-dyn-bind-empty').length)$(e).remove()});
  const related=cms('#marketing');
  if(related.length)$('#marketing').replaceWith(related.toString());else $('#marketing').remove();
  $('[data-w-tab="Comments"]').remove();
  $('.w-dyn-bind-empty').filter((_,e)=>!$(e).text().trim()&&!$(e).attr('src')).remove();
  const islands:Island[]=[{kind:'detail',item,heroProps:cmsProps(cms,'TemplateDetailHero')}];
  hydrateCms($,islands);
  return finish($,url,islands);
 }
 if(route.kind==='catalog' && (route.page==='designers'||['basic-website-templates','cms-website-templates','ecommerce-website-templates','premium-website-templates','user-accounts-website-templates','feature','languages'].includes(route.page!))){
  const cms=await publishedCms('/'+route.page+(route.slug?'/'+route.slug:''));
  const content=cms('body > .section').toArray().map(e=>cms(e).toString()).join('');
  if(!content)throw new Error('CMS collection content contract changed');
  const $=shell(content,cms('title').text(),cms('meta[name="description"]').attr('content')||'');
  const islands:Island[]=[];hydrateCms($,islands);return finish($,url,islands);
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
