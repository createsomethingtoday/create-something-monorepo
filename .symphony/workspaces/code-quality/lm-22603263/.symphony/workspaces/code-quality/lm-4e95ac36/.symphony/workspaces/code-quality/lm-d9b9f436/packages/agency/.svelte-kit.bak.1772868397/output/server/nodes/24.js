import * as server from '../entries/pages/experiments/_slug_/_page.server.ts.js';

export const index = 24;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/experiments/_slug_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/experiments/[slug]/+page.server.ts";
export const imports = ["_app/immutable/nodes/24.iBacrQK5.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DvSTLXYt.js","_app/immutable/chunks/tsl3k0Gx.js","_app/immutable/chunks/BKBDCzpW.js","_app/immutable/chunks/DqXJRMKf.js","_app/immutable/chunks/D97XJfqs.js","_app/immutable/chunks/xPDz-uK9.js","_app/immutable/chunks/DphI8CAr.js","_app/immutable/chunks/o49wPE4K.js","_app/immutable/chunks/wKc8TgY5.js","_app/immutable/chunks/ygKXnOhL.js","_app/immutable/chunks/B51yrzGy.js"];
export const stylesheets = ["_app/immutable/assets/24.BTQuBGqp.css"];
export const fonts = [];
