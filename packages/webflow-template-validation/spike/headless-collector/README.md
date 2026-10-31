# Headless collector spike

## What this proves

Webflow MCP tool output, collected with no Designer open, maps into the exact
`DesignerData` contract (`worker/src/types.ts`). The worker's
`validateDesignerData` runs on it unchanged and produces a full category
report. Mapping semantics mirror the Designer Extension collector
(`extension/src/index.ts` `collectProjectData`, `extension/src/style-metadata.ts`).

Fixtures in `fixtures/` come from one real site: MCP `get_styles`
(include_properties), `get_variable_collections`, `get_variables`,
`get_all_components` (includeInstanceCount), `query_components`
(isLibrary / isCodeComponent), and Data API `list_pages`.

## Files

- `map.ts`: pure mappers (`mapStyles` incl. `breakpointProperties`, `mapVariables`, `mapComponents`, `mapPages`, `mapSiteInfo`, `defaultMediaQueries`, `toDesignerData`).
- `collect.ts`: live source. `collectDesignerData({ client, siteId, pageId?, agentId })` calls the MCP tools through `spike/mcp-client/client.ts` and returns `{ designerData, pageId, counts, notes }`. Used by `spike/cli/cli.ts --designer-source mcp`.
- `enhance.ts`: `withDerivedFields(designerData)` adds `enhancedValidation` and `collectionMetadata`; `applyDesignerEnhancements(results, designerData)` applies the extension's client-side categories to a worker result. Both call `shared/designer-enhancements.ts`, the same module the extension imports.
- `run.ts`: loads fixtures, runs the validator, applies the shared enhancements, prints results and gaps.
- `tsconfig.json`: extends the worker config for type-checking.

## Run

```sh
cd packages/webflow-template-validation
./worker/node_modules/.bin/tsx spike/headless-collector/run.ts
./worker/node_modules/.bin/tsc --noEmit -p spike/headless-collector
```

## Live collection (`collect.ts`)

Calls, in order (all read-only):

1. `data_sites_tool` `get_site` for `siteInfo`.
2. `data_pages_tool` `list_pages`, `limit: 100`, `offset` paging until `pagination.total`.
3. `data_style_tool` `get_styles` with `query: 'all'`, `include_properties: true`, `include_breakpoints: ['medium','small','tiny']` (the bounded, non-base breakpoints from `defaultMediaQueries`, the same set the extension reads). `breakpointProperties` keeps only `width`, `min-width`, `max-width` (the extension's `BREAKPOINT_PROPERTY_WHITELIST`, imported, not copied) with string or number values.
4. `data_variable_tool` `get_variable_collections`, then `get_variables` once per collection.
5. `data_component_tool` `get_all_components` with `includeInstanceCount`, then one `query_components` call with `isLibrary` and `isCodeComponent` queries. `keywords` is required and all keywords must match, so the collector sends one query per vowel (`a`, `e`, `i`, `o`, `u`) per flag, `limit: 200`, and unions the ids. `query_components` has no offset; a query with more than 200 matches is reported in `notes`.

If `pageId` is omitted, the first page from `list_pages` is used. The style, variable, and component tools need a `pageId` but return site-wide data.

Large style payloads: there is no paging fallback. `query_styles` has no offset, and `get_styles` `filter_ids` needs ids that only the full list provides. The collector keeps whatever the server returns and puts any truncation marker (a non-JSON text block mentioning truncation, or a truncation key in the payload) in `notes`. Observed 2026-10-30 on "Webflow Selection Box": 2 styles, 557-byte response, no truncation marker, no breakpoint keys. The large-site case (the fixture site has 1531 styles) is not tested live, because the token is authorized for one small site only.

## Gaps (from run output)

| DesignerData field | Status | MCP tool/option to close |
| --- | --- | --- |
| styles[].breakpointProperties | closed in collect.ts (get_styles include_breakpoints medium/small/tiny, width/min-width/max-width whitelist); override shape is properties.breakpoints.<bp>.properties, verified live on the 1531-style marketing site (443 styles carry overrides; 531 KB response, not truncated) | n/a |
| styles[].type element/descendant | absent (MCP returns global/combo/tag only) | no headless source |
| mediaQueries | defaulted (Webflow defaults, all 7); drives styles.fixed-width-overflow from base widths only | no headless source for enabled breakpoints; ids only via style tool enums |
| variables.collections[].modes[].breakpointId | absent (name heuristic used) | no headless source (create_variable_mode accepts breakpoint_id; no read returns it) |
| variables.collections[].modes base mode | lower fidelity: MCP lists "Base mode"; unverified whether Designer getAllVariableModes does | verify against an extension payload for the same site |
| variables.collections[].variables[].value | parity: base value (contract has one value; modeValues dropped) | n/a (get_variables include_all_modes already returns modeValues) |
| components[].library.id / .name | defaulted to null (membership only) | no headless source |
| components[].readOnly | defaulted to null | no headless source |
| components[].isNested | defaulted to false | no headless source (would need per-definition element walk) |
| components[] library coverage | lower fidelity: library components may be absent until placed | no headless source (MCP cannot read library install state) |
| pages[].kind | absent | no headless source |
| pages[].collectionName | defaulted to null | data_cms_tool get collection by collectionId |
| pages[] pagination | closed in collect.ts (list_pages offset paging, 100 per call) | n/a |
| pages[].seo / openGraph | parity (Data API fields); OG title/description resolved from *Copied flags | n/a |
| assets | empty []; extension omits the key, so this adds an empty Assets category | data_assets_tool list assets, if the validator should judge them |
| siteInfo | closed in collect.ts (get_site displayName and id) | n/a |

## Parity check against the Designer Extension (2026-10-30)

Same site (Webflow Selection Box, `5b1ad56c55bb9ebc8a1301f5`), Validator app v1.3.8 run inside the Designer versus `validate --designer-source mcp`.

| Category | Extension | CLI (MCP data) |
| --- | --- | --- |
| Components | 1 error: no components | same message |
| Styles | 1 error: no typography classes | same message |
| Required Pages | 4 errors: style guide, licenses, changelog, custom 404 | same four messages |
| SEO Metadata | 3 errors: missing title, missing description, missing home OG image | same three messages |
| Style System | 1 error: missing base styles for body, h1 to h6, p, a | not produced |
| Published Site Checks | "Validator script required" setup item | not applicable (no snippet on the CLI path) |

Every category the worker computes matched message for message. The differences were the categories the extension computes client-side after the worker returns, and the snippet setup item.

### Client-side categories, now shared

The extension's client-side checks now live in `shared/designer-enhancements.ts`. The extension and the headless path call the same functions, so the headless report includes the following:

| Extension behaviour | Headless |
| --- | --- |
| "Style System" category (HTML tag base styles, variable usage) | produced |
| Page Structure rewrite (Title Case page names, name and slug mismatch) | produced |
| Variable Modes normalization (name-only warning to info when modes exist) | produced |
| Category sort and recomputed summary totals | produced |
| `enhancedValidation` flags and `collectionMetadata` in the payload | produced by `collect.ts` |
| "Canvas Checks (Current Page)" (heading order, image alt text on the open page) | needs the Designer. Reported as unavailable with one info issue that gives the reason |
| Republish hints on published-site issues | needs the Designer canvas result. Not added |
| `enhancedValidation.seoCompliance` (current page SEO) | needs the Designer current page. All flags stay false |
| `addVariableValidation`, `addComponentValidation` | moved to the shared module, but neither path calls them: they duplicate the worker's Variables and Components categories |

The CLI applies these with `applyDesignerEnhancements(result, designerData)` from `enhance.ts`.
