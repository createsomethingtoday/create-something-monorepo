import operatorPalette from './operator.tokens.json' with { type: 'json' };

/** Canon operator tokens for nonce-protected standalone document styles. */
export const operatorDocumentCss = `:root{color-scheme:dark;${Object.entries(operatorPalette.tokens)
  .map(([name, value]) => `${name}:${value};`)
  .join('')}}`;
