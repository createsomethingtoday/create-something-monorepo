import { cp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('public/', root), new URL('dist/', root), { recursive: true });
await copyFile(new URL('../canon-tokens/tokens.css', root), new URL('dist/tokens.css', root));
await copyFile(new URL('worker.mjs', root), new URL('dist/_worker.js', root));
// Truthful fallback if the existing provider fail-open policy serves static assets.
await copyFile(new URL('public/index.html', root), new URL('dist/404.html', root));
await writeFile(new URL('dist/_routes.json', root), JSON.stringify({ version: 1, include: ['/*'], exclude: [] }) + '\n');
console.log('Built Templates retirement assets and edge guard. No dependencies or provider calls.');
