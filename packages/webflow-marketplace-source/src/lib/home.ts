import type {Template,Term} from './api';
import {localLink} from './routes.mjs';

// Redesigned Marketplace home (claude.ai/artifact/V3dGyP7LZULLvYZEMVVyH2, v42).
// Server-rendered markup; template cards stay the production TemplateCard via
// <source-island> placeholders, filled in document order by the page router.

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const categoryUrl=(slug:string)=>`/templates/category/${encodeURIComponent(slug)}`;
const count=(n:number)=>n.toLocaleString('en-US');

// The redesign's seven tiles, in its order. Other categories render as a text list.
export const TILE_CATEGORIES=['portfolio-and-agency-websites','technology-websites','professional-services-websites','retail-and-e-commerce-websites','food-and-drink-websites','architecture-and-design-websites','real-estate-websites'];
const CHIPS:[string,string][]=[['Portfolio','portfolio-and-agency-websites'],['SaaS','technology-websites'],['Ecommerce','retail-and-e-commerce-websites'],['Restaurants','food-and-drink-websites']];
// Sentence case for display; the API names use title case.
const label=(name:string)=>name.replace(/(?<=\s)([A-Z])(?=[a-z])/g,c=>c.toLowerCase()).replace(/\bUi\b/i,'UI').replace(/\bHr\b/i,'HR').replace(/E-commerce/i,'e-commerce');

export interface HomeData {
 total:number;
 hero:Template[];
 creators:Template[];
 categories:Term[];
 stacks:Record<string,Template[]>;
}

function heroCard(t:Template){
 return `<a class="rd-hero-card" href="${esc(localLink(t.url))}" aria-label="${esc(`View ${t.name} by ${t.creator_name}, ${t.is_free?'Free':`${t.price} USD`}`)}"><img src="${esc(t.thumbnail_image_url)}" alt="" loading="eager"><span class="rd-hero-caption"><span>${esc(t.name)} <span aria-hidden="true">→</span></span><span>${t.is_free?'Free':`${esc(t.price)} USD`}</span></span></a>`;
}
function tile(c:Term,stack:Template[]){
 const imgs=stack.slice(0,3).map((t,i)=>`<img src="${esc(t.thumbnail_image_url)}" alt="" loading="lazy" style="--i:${i-1}">`).join('');
 return `<a class="rd-cat-tile" href="${categoryUrl(c.slug)}"><span class="rd-cstack" aria-hidden="true">${imgs}</span><span class="rd-cat-name"><span>${esc(label(c.name))}</span><span aria-hidden="true">→</span></span><span class="rd-muted rd-sm">${count(c.count||0)} templates</span></a>`;
}
function creator(t:Template){
 const avatar=t.creator_avatar_url?`<img src="${esc(t.creator_avatar_url)}" alt="">`:esc(t.creator_name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase());
 return `<a class="rd-creator" href="${esc(localLink(t.creator_profile_url))}"><img class="rd-creator-shot" src="${esc(t.thumbnail_image_url)}" alt="" loading="lazy"><span class="rd-avatar" aria-hidden="true">${avatar}</span><span class="rd-h6">${esc(t.creator_name)}</span><span class="rd-muted rd-sm">Featured work: ${esc(t.name)}</span><span class="rd-sm rd-blue">View profile →</span></a>`;
}
function heading(eyebrow:string,title:string,id:string,link?:[string,string],level='rd-h3'){
 return `<div class="rd-head"><div><p class="rd-eyebrow">${esc(eyebrow)}</p><h2 id="${id}" class="${level}">${esc(title)}</h2></div>${link?`<a class="rd-text-link" href="${link[1]}">${esc(link[0])}</a>`:''}</div>`;
}

export function homeMarkup(d:HomeData){
 const byslug=new Map(d.categories.map(c=>[c.slug,c]));
 const tiles=TILE_CATEGORIES.map(s=>byslug.get(s)).filter((c):c is Term=>!!c);
 const rest=d.categories.filter(c=>!TILE_CATEGORIES.includes(c.slug)).sort((a,b)=>(b.count||0)-(a.count||0)||a.name.localeCompare(b.name)).slice(0,10);
 return `<main id="main" class="rd-home">
 <section class="rd-hero" aria-labelledby="rd-hero-h">
  <p class="rd-eyebrow">Webflow Templates</p>
  <h1 id="rd-hero-h" class="rd-h1">Start with a site<br>that already works</h1>
  <p class="rd-lead">Templates from the Webflow creator community, reviewed by Webflow and ready to make your own in the Designer.</p>
  <form class="rd-search" action="/templates/search" method="get" role="search">
   <label class="rd-sr" for="rd-q">Search templates</label>
   <input id="rd-q" name="q" type="search" placeholder="Search by name, category, or creator" autocomplete="off">
   <button type="submit" class="rd-btn rd-btn-primary">Search</button>
  </form>
  <nav class="rd-chips" aria-label="Popular categories">${CHIPS.map(([text,slug])=>`<a class="rd-chip" href="${categoryUrl(slug)}">${esc(text)}</a>`).join('')}</nav>
  <a class="rd-text-link" href="/templates/all">Browse all templates <span aria-hidden="true">→</span></a>
  <p class="rd-muted rd-sm">${count(d.total)} templates · Free and paid · <a href="/templates/submission-guidelines">Explore our review guidelines</a></p>
  <div class="rd-hero-shots">${d.hero.map(heroCard).join('')}</div>
 </section>

 <section class="rd-wrap rd-feat" aria-labelledby="rd-feat-h">
  <div class="rd-head rd-head-split"><div><p class="rd-eyebrow">Featured this month</p><h2 id="rd-feat-h" class="rd-h2">Picked by the template review team</h2></div><div><p class="rd-muted">Each month we feature templates that stand out for design quality, structure, and craft.</p><a class="rd-text-link" href="/templates/featured">See all featured →</a></div></div>
  <source-island></source-island>
 </section>

 <section class="rd-wrap rd-mcp-wrap" aria-labelledby="rd-mcp-h">
  <div class="rd-mcp">
   <div><p class="rd-eyebrow rd-eyebrow-blue">New · Webflow MCP 2.0</p><h2 id="rd-mcp-h" class="rd-h5">Found one? Make it yours with an AI agent.</h2><p class="rd-sm">Install a template, then let your agent customize its components, styles, CMS content and pages through MCP 2.0.</p></div>
   <div class="rd-mcp-actions"><a class="rd-btn rd-btn-primary" href="https://webflow.com/ai" target="_blank" rel="noopener noreferrer">Explore Webflow AI</a><a class="rd-btn rd-btn-ghost" href="https://developers.webflow.com/mcp/reference/overview" target="_blank" rel="noopener noreferrer">Get started with MCP</a></div>
  </div>
 </section>

 <section class="rd-wrap" aria-labelledby="rd-cat-h">
  ${heading('Browse by category','What are you building?','rd-cat-h')}
  <div class="rd-cat-grid">${tiles.map(c=>tile(c,d.stacks[c.slug]||[])).join('')}<a class="rd-cat-all" href="/templates/all"><span class="rd-h6">All templates</span><span class="rd-muted rd-sm">Browse every category, explore styles, and sort by newest →</span></a></div>
  <nav class="rd-more" aria-labelledby="rd-more-h">
   <div class="rd-head"><h3 id="rd-more-h" class="rd-h6">More categories</h3><a class="rd-text-link" href="/templates/categories">All categories →</a></div>
   <div class="rd-mcat-list">${rest.map(c=>`<a class="rd-mcat" href="${categoryUrl(c.slug)}"><span>${esc(label(c.name))}</span><span class="rd-muted">${count(c.count||0)}</span></a>`).join('')}</div>
  </nav>
 </section>

 <section class="rd-wrap" aria-labelledby="rd-free-h">
  <div class="rd-free">
   ${heading('Start for $0','Free templates','rd-free-h',['See all free templates →','/templates/free-website-templates'])}
   <p class="rd-muted rd-free-lead">Clone a free template into your Workspace and start building on a free Starter site.</p>
   <source-island></source-island>
  </div>
 </section>

 <section class="rd-wrap" aria-labelledby="rd-new-h">
  ${heading('Just added','New templates','rd-new-h',['See all new →','/templates/new-website-templates'])}
  <source-island></source-island>
 </section>

 <section class="rd-wrap rd-creators" aria-labelledby="rd-cr-h">
  ${heading('Creators','Made by the creator community','rd-cr-h',['Browse all creators →','/templates/designers'])}
  <div class="rd-creator-row">${d.creators.map(creator).join('')}</div>
 </section>
</main>`;
}

export function pickCreators(items:Template[],n=4){
 const seen=new Set<string>();const out:Template[]=[];
 for(const t of items){if(!t.creator_slug||seen.has(t.creator_slug))continue;seen.add(t.creator_slug);out.push(t);if(out.length===n)break;}
 return out;
}
