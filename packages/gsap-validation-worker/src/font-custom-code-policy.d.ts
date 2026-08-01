export type FontCustomCodeFinding = {
  kind: 'font-stylesheet-link' | 'font-import' | 'inline-font-face';
  source: string;
  policy: 'custom-code-font-loading';
  message: string;
};

export declare const FONT_CUSTOM_CODE_POLICY: 'custom-code-font-loading';
export declare const FONT_CUSTOM_CODE_MESSAGE: string;
export declare function isKnownFontStylesheetUrl(value: string | undefined): boolean;
export declare function findProhibitedFontCustomCode(html: string): FontCustomCodeFinding[];
