/** Port component-owned root destinations to the correct Webflow or Source owner. */
export function initNavigation(){
 const fix=(root:ParentNode)=>root.querySelectorAll<HTMLAnchorElement>('a[href="/marketplace"]').forEach(link=>link.href='https://webflow.com/marketplace');
 fix(document);new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof Element){if(node.matches('a[href="/marketplace"]'))(node as HTMLAnchorElement).href='https://webflow.com/marketplace';fix(node)}}))).observe(document.body,{childList:true,subtree:true});
}
