import * as server from '../entries/pages/mcp-access/_page.server.ts.js';

export const index = 26;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/mcp-access/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/mcp-access/+page.server.ts";
export const imports = ["_app/immutable/nodes/26.BK2LA8zK.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/ygKXnOhL.js","_app/immutable/chunks/tsl3k0Gx.js","_app/immutable/chunks/DphI8CAr.js","_app/immutable/chunks/xPDz-uK9.js","_app/immutable/chunks/D97XJfqs.js","_app/immutable/chunks/o49wPE4K.js","_app/immutable/chunks/wKc8TgY5.js","_app/immutable/chunks/DvSTLXYt.js","_app/immutable/chunks/BKBDCzpW.js","_app/immutable/chunks/DqXJRMKf.js"];
export const stylesheets = ["_app/immutable/assets/26.c3brjOkM.css"];
export const fonts = [];
