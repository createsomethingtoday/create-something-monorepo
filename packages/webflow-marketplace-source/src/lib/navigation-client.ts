/** Port component-owned root destinations to the correct Webflow or Source owner. */
export function initNavigation(){
 document.querySelectorAll<HTMLAnchorElement>('[data-source-back]').forEach(link=>link.addEventListener('click',event=>{try{const previous=new URL(document.referrer);if(previous.origin===location.origin&&previous.pathname.startsWith('/templates')&&!previous.pathname.includes('/html/')){event.preventDefault();history.back();}}catch{/* Direct visits use the browse fallback. */}}));
 const fix=(root:ParentNode)=>root.querySelectorAll<HTMLAnchorElement>('a[href="/marketplace"]').forEach(link=>link.href='https://webflow.com/marketplace');
 fix(document);new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof Element){if(node.matches('a[href="/marketplace"]'))(node as HTMLAnchorElement).href='https://webflow.com/marketplace';fix(node)}}))).observe(document.body,{childList:true,subtree:true});
}
