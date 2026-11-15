// Run with a browser Page (ego-browser or Playwright). Read-only: no tool is executed.
// A stub document.modelContext records what each route registers through WebMCP.
const CATALOG=['search_templates','list_categories_and_styles','get_template','update_page_filters','get_page_state','get_marketplace_reference'];
export const AGENT_TOOL_ROUTES=[
 ['/templates',[]],
 ['/templates/all',[]],
 ['/templates/category/technology-websites',[]],
 ['/templates/designers/caseflow',['get_creator_storefront']],
 ['/templates/html/fycare-website-template',['get_template_details']],
 ['/templates/search?q=portfolio',['get_search_results','set_search_brief','compare_templates']],
 ['/templates/chat',[]],
 ['/templates/submission-guidelines',[]],
];
const STUB=`(()=>{const tools=[];Object.defineProperty(document,'modelContext',{configurable:true,value:{registerTool(tool){tools.push({name:tool.name,readOnly:tool.annotations?.readOnlyHint})}}});window.__registeredAgentTools=tools})()`;
export async function verifyAgentTools(page,origin){
 if(page.addInitScript)await page.addInitScript(STUB);else await page.cdp('Page.addScriptToEvaluateOnNewDocument',{source:STUB});
 const receipts=[];
 for(const [path,surfaceTools] of AGENT_TOOL_ROUTES){
  await page.goto(origin+path);
  await page.waitForFunction(()=>window.__templateMarketplaceAgentToolsInstalled===true&&window.__registeredAgentTools.length>0,undefined,{timeout:20000});
  const tools=await page.evaluate(()=>window.__registeredAgentTools);
  const names=tools.map(tool=>tool.name),expected=[...CATALOG,...surfaceTools];
  if(names.length!==new Set(names).size)throw new Error(`${path}: duplicate registration ${names}`);
  if(expected.join()!==names.join())throw new Error(`${path}: expected ${expected} got ${names}`);
  receipts.push({path,tools:names.length,writeTools:tools.filter(tool=>!tool.readOnly).map(tool=>tool.name)});
 }
 return receipts;
}
