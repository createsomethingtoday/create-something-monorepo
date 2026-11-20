/**
 * Run the worker's designer validator on DesignerData built from MCP fixtures.
 * Usage (from packages/webflow-template-validation):
 *   ./worker/node_modules/.bin/tsx spike/headless-collector/run.ts
 */

import { validateDesignerData } from '../../worker/src/validators/designer-validator';
import { applyDesignerEnhancements, withDerivedFields } from './enhance';
import { toDesignerData, type DataApiPage, type McpComponent, type McpStyle, type McpVariable } from './map';
import stylesFx from './fixtures/styles.json';
import collectionsFx from './fixtures/collections.json';
import variablesFx from './fixtures/variables.json';
import componentsFx from './fixtures/components.json';
import componentFlagsFx from './fixtures/component-flags.json';
import pagesFx from './fixtures/pages.json';

const TOP_ISSUES = 5;

// The fixture holds one get_variables call, for the only collection.
const collections = collectionsFx.result;
const data = withDerivedFields(toDesignerData({
	styles: stylesFx.result as McpStyle[],
	collections,
	variablesByCollection: { [collections[0].id]: variablesFx.result as McpVariable[] },
	components: componentsFx.result as McpComponent[],
	componentFlags: { library: componentFlagsFx.library, code: componentFlagsFx.code },
	pages: pagesFx.result.pages as DataApiPage[]
}));

const GAPS: Array<[field: string, status: string, closeWith: string]> = [
	['styles[].breakpointProperties', 'closed in collect.ts (get_styles include_breakpoints medium/small/tiny, width/min-width/max-width whitelist); override shape properties.breakpoints.<bp>.properties verified live 2026-10-30 (443 of 1531 styles carry overrides, 531 KB, not truncated)', 'n/a'],
	['styles[].type element/descendant', 'absent (MCP returns global/combo/tag only)', 'no headless source'],
	['mediaQueries', 'defaulted (Webflow defaults, all 7); drives styles.fixed-width-overflow from base widths only', 'no headless source for enabled breakpoints; ids only via style tool enums'],
	['variables.collections[].modes[].breakpointId', 'absent (name heuristic used)', 'no headless source (create_variable_mode accepts breakpoint_id; no read returns it)'],
	['variables.collections[].modes base mode', 'lower fidelity: MCP lists "Base mode"; unverified whether Designer getAllVariableModes does', 'verify against an extension payload for the same site'],
	['variables.collections[].variables[].value', 'parity: base value (contract has one value; modeValues dropped)', 'n/a (get_variables include_all_modes already returns modeValues)'],
	['components[].library.id / .name', 'defaulted to null (membership only)', 'no headless source'],
	['components[].readOnly', 'defaulted to null', 'no headless source'],
	['components[].isNested', 'defaulted to false', 'no headless source (would need per-definition element walk)'],
	['components[] library coverage', 'lower fidelity: library components may be absent until placed', 'no headless source (MCP cannot read library install state)'],
	['pages[].kind', 'absent', 'no headless source'],
	['pages[].collectionName', 'defaulted to null', 'data_cms_tool get collection by collectionId'],
	['pages[] pagination', 'closed in collect.ts (list_pages offset paging, 100 per call)', 'n/a'],
	['pages[].seo / openGraph', 'parity (Data API fields); OG title/description resolved from *Copied flags', 'n/a'],
	['assets', 'empty []; extension omits the key, so this adds an empty Assets category', 'data_assets_tool list assets, if the validator should judge them'],
	['siteInfo', 'closed in collect.ts (get_site displayName and id)', 'n/a']
];

function line(text = ''): void {
	console.log(text);
}

async function main(): Promise<void> {
	const result = await validateDesignerData(data);

	line('== COLLECTION STATS ==');
	const vars = data.variables?.collections ?? [];
	line(`styles: ${data.styles.length} (of ${stylesFx.result.length} from MCP; tag ${data.styles.filter((s) => s.isHtmlTag).length}, library ${data.styles.filter((s) => s.source === 'library').length}, with variables ${data.styles.filter((s) => s.hasVariables).length})`);
	line(`variables: ${vars.reduce((n, c) => n + c.variables.length, 0)} in ${vars.length} collection(s), modes ${vars.reduce((n, c) => n + (c.modes?.length ?? 0), 0)}`);
	line(`components: ${data.components.length} (library ${data.components.filter((c) => c.library).length}, code ${data.components.filter((c) => c.codeComponent).length})`);
	line(`pages: ${data.pages.length} (cms templates ${data.pages.filter((p) => p.isCmsTemplate).length}, drafts ${data.pages.filter((p) => p.isDraft).length}, home ${data.pages.filter((p) => p.isHomePage).map((p) => p.publishPath).join(', ')})`);
	line(`mediaQueries: ${data.mediaQueries?.length ?? 0} (defaulted)`);

	line();
	line('== VALIDATOR RESULT ==');
	const s = result.summary;
	line(`errors ${s.errors}, warnings ${s.warnings}, infos ${s.infos}; categories passed ${s.passedCategories}, failed ${s.failedCategories}`);
	for (const c of result.categories) {
		const count = (sev: string) => c.issues.filter((i) => i.severity === sev).length;
		line();
		line(`[${c.passed ? 'PASS' : 'FAIL'}] ${c.category}: ${count('error')} error, ${count('warning')} warning, ${count('info')} info`);
		for (const i of c.issues.slice(0, TOP_ISSUES)) {
			line(`  - ${i.id} (${i.severity}): ${i.message}`);
		}
		if (c.stats) line(`  stats: ${JSON.stringify(c.stats)}`);
	}

	// Client-side categories the extension adds after the worker returns.
	const before = new Map(result.categories.map((c) => [c.category, JSON.stringify(c)]));
	const enhanced = applyDesignerEnhancements(result, data);
	line();
	line('== DESIGNER ENHANCEMENTS (shared/designer-enhancements.ts) ==');
	line(`enhancedValidation.styleSystem: ${JSON.stringify(data.enhancedValidation?.styleSystem)}`);
	line(`collectionMetadata: ${JSON.stringify(data.collectionMetadata)}`);
	const t = enhanced.summary;
	line(`after enhancement: errors ${t.totalErrors}, warnings ${t.totalWarnings}, info ${t.totalInfo}; categories passed ${t.passedCategories}, failed ${t.failedCategories}`);
	for (const c of enhanced.categories) {
		const prior = before.get(c.category);
		if (prior === JSON.stringify(c)) continue;
		const count = (sev: string) => c.issues.filter((i) => i.severity === sev).length;
		line();
		line(`[${c.passed ? 'PASS' : 'FAIL'}] ${c.category} (${prior ? 'changed' : 'added'}): ${count('error')} error, ${count('warning')} warning, ${count('info')} info`);
		for (const i of c.issues.slice(0, TOP_ISSUES)) {
			line(`  - ${i.id} (${i.severity}): ${i.message}`);
		}
		if (c.stats) line(`  stats: ${JSON.stringify(c.stats)}`);
	}

	line();
	line('== GAPS (vs Designer Extension path) ==');
	line('| DesignerData field | Status | MCP tool/option to close |');
	line('| --- | --- | --- |');
	for (const [field, status, closeWith] of GAPS) line(`| ${field} | ${status} | ${closeWith} |`);
}

main().catch((error) => {
	console.error(error);
	throw error;
});
