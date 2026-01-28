import { generateAllTokensCSS } from '../src/lib/tokens/index.ts';
const css = await generateAllTokensCSS();
console.log(css);
