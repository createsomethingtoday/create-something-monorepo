export const SERVICE_ROUTES = new Set(['services/home','services/service-type','services/budget','services/schedule','services/search-results']);
export const REFERENCE_ROUTES = new Set(['submission-guidelines','grading-rubric','styleguide','styles/type','styles/components','styles/layout','services/onboarding-guide','services/stripe-onboarding-guide','services/component-library','services/program-guidelines']);
export const CATALOG_ROUTES = new Set(['all','free','landing-pages','featured','free-website-templates','popular-website-templates','new-website-templates','landing-page','search','search-results','search-v2','basic-website-templates','cms-website-templates','ecommerce-website-templates','premium-website-templates','user-accounts-website-templates']);
export const DYNAMIC_KINDS = new Set(['category','subcategory','style','tag','designers','html','feature','languages']);
export function routeFor(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/templates') return {kind:'home'};
  if (!path.startsWith('/templates/')) return {kind:'missing'};
  const reference=path.slice('/templates/'.length);
  if(SERVICE_ROUTES.has(reference))return {kind:'service',page:reference};
  if(REFERENCE_ROUTES.has(reference))return {kind:'reference',page:reference};
  const parts = path.slice('/templates/'.length).split('/');
  if(parts.length===1&&parts[0]==='services')return {kind:'service',page:'services/home'};
  if(parts.length===1&&parts[0]==='applications')return {kind:'published',page:'applications'};
  if(parts.length===2&&['groups','success-stories','notifications','faqs'].includes(parts[0])&&/^[a-z0-9][a-z0-9-]*$/.test(parts[1]))return {kind:'published',page:parts[0],slug:parts[1]};
  if (parts.length===1&&parts[0]==='slack-invitation-request')return {kind:'invitation'};
  if (parts.length===1&&parts[0]==='submit-a-library')return {kind:'library'};
  if (parts.length===1&&['submit-a-template','submit-a-template-clone'].includes(parts[0]))return {kind:'submission'};
  if (parts.length===1&&parts[0]==='chat')return {kind:'chat'};
  if (parts.length === 1 && CATALOG_ROUTES.has(parts[0])) return {kind:'catalog',page:parts[0]};
  if (parts.length === 1 && ['categories','designers','template-licenses','tags'].includes(parts[0])) return {kind:'static',page:parts[0]};
  if (parts.length === 2 && DYNAMIC_KINDS.has(parts[0]) && /^[a-z0-9][a-z0-9-]*$/.test(parts[1])) return {kind:parts[0] === 'html' ? 'detail' : 'catalog',page:parts[0],slug:parts[1]};
  return {kind:'missing'};
}
export function localLink(value) {
  if (!value) return '';
  if (/^(?:#|mailto:|tel:)/i.test(value)) return value;
  try {
    const u = new URL(value, 'https://webflow.com');
    if (!['http:','https:'].includes(u.protocol)) return '';
    if (u.hostname === 'webflow.com' && routeFor(u.pathname).kind !== 'missing') return u.pathname + u.search + u.hash;
    return u.href;
  } catch { return ''; }
}
export function searchFilters(route, url) {
  const p = new URLSearchParams(url.search);
  if (p.has('query') && !p.has('q')) p.set('q',p.get('query'));
  if(p.has('category'))p.set('category_group_slug',p.get('category'));
  if(p.has('subcategory'))p.set('child_category_slug',p.get('subcategory'));
  const keys={category:'category_group_slug',subcategory:'child_category_slug',designers:'creator_slug',style:'style_slug',tag:'tag_slug'};
  if (keys[route.page] && route.slug) p.set(keys[route.page],route.page==='style'?route.slug.replace(/-[a-f0-9]{5}$/,''):route.slug);
  if (route.page==='featured') p.set('scope','featured');
  if (['free','free-website-templates'].includes(route.page)) p.set('scope','free');
  if (['landing-page','landing-pages'].includes(route.page)) p.set('scope','landing_pages');
  if (!p.has('sort')) p.set('sort',route.page==='popular-website-templates' ? 'popular' : 'newest');
  return p;
}
