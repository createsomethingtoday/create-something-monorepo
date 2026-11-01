/**
 * Headless collector spike: map Webflow MCP tool output to the worker's
 * DesignerData contract. Pure functions, no I/O. Semantics mirror the Designer
 * Extension collector (extension/src/index.ts collectProjectData and
 * extension/src/style-metadata.ts).
 */

import type {
	ComponentData,
	DesignerData,
	MediaQueryData,
	PageData,
	SiteInfo,
	StyleData,
	VariableCollection
} from '../../worker/src/types';
import { isHtmlTagStyleName } from '../../extension/src/utils';
import { BREAKPOINT_PROPERTY_WHITELIST } from '../../extension/src/style-metadata';

// --- MCP input shapes (only the fields this mapping reads) ---

type McpPropertyValue = string | { id: string };

export interface McpStyle {
	id: string;
	name: string;
	isFromLibrary: boolean;
	isComboClass: boolean;
	type: 'global' | 'combo' | 'tag';
	selector: string;
	/**
	 * 'base' always; 'breakpoints' is keyed by breakpoint id ('medium', 'small',
	 * 'tiny', ...) when get_styles ran with include_breakpoints and the style has
	 * an override there. Shape verified live on 2026-10-30.
	 */
	properties?: {
		base?: { properties?: Record<string, McpPropertyValue> };
		breakpoints?: Record<string, { properties?: Record<string, McpPropertyValue> } | undefined>;
	};
}

export interface McpSite {
	id: string;
	displayName?: string;
	shortName?: string;
}

export interface McpCollection {
	id: string;
	name: string;
	modes?: Array<{ id: string; name: string }>;
}

export interface McpVariable {
	id: string;
	name: string;
	type: string;
	cssName?: string;
	value: unknown;
	modeValues?: Array<{ modeId: string; value: unknown }>;
}

export interface McpComponent {
	id: string;
	name: string;
	group?: string;
	instanceCount?: number;
}

export interface ComponentFlags {
	library: string[];
	code: string[];
}

export interface DataApiPage {
	id: string;
	title: string;
	slug?: string;
	draft?: boolean;
	archived?: boolean;
	collectionId?: string | null;
	publishedPath?: string;
	seo?: { title?: string; description?: string };
	openGraph?: {
		title?: string;
		description?: string;
		imageUrl?: string | null;
		titleCopied?: boolean;
		descriptionCopied?: boolean;
	};
}

export interface Fixtures {
	styles: McpStyle[];
	collections: McpCollection[];
	/** Variables keyed by collection id (one get_variables call per collection). */
	variablesByCollection: Record<string, McpVariable[]>;
	components: McpComponent[];
	componentFlags: ComponentFlags;
	pages: DataApiPage[];
	site?: McpSite;
}

// --- Mappers ---

const isVariableRef = (value: unknown): boolean =>
	typeof value === 'object' && value !== null && 'id' in value;

export function mapStyles(styles: McpStyle[]): StyleData[] {
	return (
		styles
			// Extension shouldIncludeStyle: drop nameless and '_'-prefixed styles.
			// MCP never returns 'element' styles, so the element exception is moot.
			.filter((s) => !!s.name && !s.name.startsWith('_'))
			.map((s) => {
				const properties = s.properties?.base?.properties ?? {};
				const breakpointProperties = mapBreakpointProperties(s.properties);
				return {
					id: s.id,
					name: s.name,
					type: s.type,
					source: s.isFromLibrary ? 'library' : 'site',
					// Extension isTagStyle: the Designer taxonomy wins when present.
					isHtmlTag: s.type ? s.type === 'tag' : isHtmlTagStyleName(s.name),
					hasVariables: Object.values(properties).some(isVariableRef),
					properties,
					...(breakpointProperties ? { breakpointProperties } : {})
				};
			})
	);
}

/** Bounded, non-base breakpoints, the same set the extension reads per style. */
export function boundedBreakpointIds(): string[] {
	return defaultMediaQueries()
		.filter((mq) => !mq.isBase && mq.maxWidth !== null)
		.map((mq) => mq.id);
}

/**
 * Extension readBreakpointProperties: keep only whitelisted keys with string or
 * number values (variable references are dropped), omit empty breakpoints.
 */
function mapBreakpointProperties(byBreakpoint: McpStyle['properties']): StyleData['breakpointProperties'] {
	const result: Record<string, Record<string, string>> = {};
	for (const id of boundedBreakpointIds()) {
		const props = byBreakpoint?.breakpoints?.[id]?.properties;
		if (!props) continue;
		const kept: Record<string, string> = {};
		for (const key of BREAKPOINT_PROPERTY_WHITELIST) {
			const value: unknown = props[key];
			if (typeof value === 'string' || typeof value === 'number') kept[key] = String(value);
		}
		if (Object.keys(kept).length > 0) result[id] = kept;
	}
	return Object.keys(result).length > 0 ? result : undefined;
}

export function mapSiteInfo(site: McpSite): SiteInfo {
	return { id: site.id, name: site.displayName || site.shortName || 'Unnamed site' };
}

export function mapVariables(
	collections: McpCollection[],
	variablesByCollection: Record<string, McpVariable[]>
): VariableCollection[] {
	return collections.map((c) => ({
		id: c.id,
		name: c.name || 'Unnamed Collection',
		// type passes through verbatim ('Color', 'Size', ...), as the extension
		// passes the Designer API value through verbatim.
		variables: (variablesByCollection[c.id] ?? []).map((v) => ({
			id: v.id,
			name: v.name,
			type: v.type,
			value: v.value ?? null
		})),
		// breakpointId omitted: MCP does not report mode-to-breakpoint bindings, so
		// the validator falls back to the name heuristic per mode.
		...(Array.isArray(c.modes) ? { modes: c.modes.map((m) => ({ id: String(m.id), name: m.name || m.id })) } : {})
	}));
}

export function mapComponents(components: McpComponent[], flags: ComponentFlags): ComponentData[] {
	const library = new Set(flags.library);
	const code = new Set(flags.code);
	return components.map((c) => ({
		id: c.id,
		name: c.name,
		type: 'component',
		instances: c.instanceCount ?? 0,
		isNested: false,
		readOnly: null,
		codeComponent: code.has(c.id),
		library: library.has(c.id) ? { id: null, name: null } : null
	}));
}

export function mapPages(pages: DataApiPage[]): PageData[] {
	return pages
		.filter((p) => !p.archived)
		.map((p) => {
			const slug = p.slug ?? '';
			const publishPath = p.publishedPath ?? null;
			const og = p.openGraph ?? {};
			const seo = p.seo ?? {};
			return {
				id: p.id,
				name: p.title || 'Unnamed',
				slug,
				path: slug,
				publishPath,
				collectionId: p.collectionId ?? null,
				collectionName: null,
				isCmsTemplate: !!p.collectionId,
				isDraft: !!p.draft,
				type: 'Page',
				isHomePage: publishPath === '/' || slug === '',
				seo: {
					title: seo.title,
					description: seo.description,
					openGraphTitle: og.titleCopied ? seo.title : og.title,
					openGraphDescription: og.descriptionCopied ? seo.description : og.description,
					openGraphImage: og.imageUrl ?? undefined
				}
			};
		});
}

/** Webflow default breakpoints. MCP exposes the ids but not which are enabled. */
export function defaultMediaQueries(): MediaQueryData[] {
	return [
		{ id: 'xxl', name: '1920px', minWidth: 1920, maxWidth: null, isBase: false },
		{ id: 'xl', name: '1440px', minWidth: 1440, maxWidth: null, isBase: false },
		{ id: 'large', name: '1280px', minWidth: 1280, maxWidth: null, isBase: false },
		{ id: 'main', name: 'Desktop', minWidth: 992, maxWidth: 1279, isBase: true },
		{ id: 'medium', name: 'Tablet', minWidth: null, maxWidth: 991, isBase: false },
		{ id: 'small', name: 'Mobile landscape', minWidth: null, maxWidth: 767, isBase: false },
		{ id: 'tiny', name: 'Mobile portrait', minWidth: null, maxWidth: 479, isBase: false }
	];
}

export function toDesignerData(f: Fixtures): DesignerData {
	return {
		variables: { collections: mapVariables(f.collections, f.variablesByCollection) },
		components: mapComponents(f.components, f.componentFlags),
		styles: mapStyles(f.styles),
		pages: mapPages(f.pages),
		assets: [],
		mediaQueries: defaultMediaQueries(),
		...(f.site ? { siteInfo: mapSiteInfo(f.site) } : {})
	};
}
