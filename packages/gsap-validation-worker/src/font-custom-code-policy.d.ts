export type FontCustomCodeFinding = {
  kind: 'font-stylesheet-link' | 'font-import' | 'inline-font-face';
  source: string;
  policy: 'custom-code-font-loading';
  message: string;
};

export type SchemaMarkupFinding = {
  kind: 'schema-markup';
  source: 'script[type="application/ld+json"]';
  policy: 'custom-code-schema-markup-not-allowed';
  message: string;
};

export type HtmlEmbedFinding = {
  kind: 'html-embed-markup';
  source: string;
  policy: 'custom-code-html-embed-not-allowed';
  message: string;
};

export type HtmlEmbedScriptFinding = {
  kind: 'html-embed-script';
  source: string;
  policy: 'custom-code-html-embed-script-unverified';
  message: string;
};

export type MarketplaceCustomCodeFinding =
  | FontCustomCodeFinding
  | SchemaMarkupFinding
  | HtmlEmbedFinding;

export declare const FONT_CUSTOM_CODE_POLICY: 'custom-code-font-loading';
export declare const FONT_CUSTOM_CODE_MESSAGE: string;
export declare const SCHEMA_MARKUP_POLICY: 'custom-code-schema-markup-not-allowed';
export declare const SCHEMA_MARKUP_MESSAGE: string;
export declare const HTML_EMBED_POLICY: 'custom-code-html-embed-not-allowed';
export declare const HTML_EMBED_MESSAGE: string;
export declare function isKnownFontStylesheetUrl(value: string | undefined): boolean;
export declare function findProhibitedFontCustomCode(html: string): FontCustomCodeFinding[];
export declare function findProhibitedSchemaMarkup(html: string): SchemaMarkupFinding[];
export declare function disallowedEmbedTags(embedHtml: string): string[];
export declare const HTML_EMBED_SCRIPT_POLICY: 'custom-code-html-embed-script-unverified';
export declare const HTML_EMBED_SCRIPT_MESSAGE: string;
export declare function findProhibitedHtmlEmbeds(html: string): HtmlEmbedFinding[];
export declare function findHtmlEmbedScripts(html: string): HtmlEmbedScriptFinding[];
export declare function findProhibitedMarketplaceCustomCode(
  html: string
): MarketplaceCustomCodeFinding[];
