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

export type MarketplaceCustomCodeFinding = FontCustomCodeFinding | SchemaMarkupFinding;

export declare const FONT_CUSTOM_CODE_POLICY: 'custom-code-font-loading';
export declare const FONT_CUSTOM_CODE_MESSAGE: string;
export declare const SCHEMA_MARKUP_POLICY: 'custom-code-schema-markup-not-allowed';
export declare const SCHEMA_MARKUP_MESSAGE: string;
export declare function isKnownFontStylesheetUrl(value: string | undefined): boolean;
export declare function findProhibitedFontCustomCode(html: string): FontCustomCodeFinding[];
export declare function findProhibitedSchemaMarkup(html: string): SchemaMarkupFinding[];
export declare function findProhibitedMarketplaceCustomCode(
  html: string
): MarketplaceCustomCodeFinding[];
