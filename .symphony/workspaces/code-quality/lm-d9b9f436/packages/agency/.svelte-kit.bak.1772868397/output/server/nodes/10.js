import * as server from '../entries/pages/admin/security/_page.server.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/security/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/security/+page.server.ts";
export const imports = ["_app/immutable/nodes/10.CxAP_OZ3.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/tsl3k0Gx.js","_app/immutable/chunks/DphI8CAr.js","_app/immutable/chunks/xPDz-uK9.js","_app/immutable/chunks/D97XJfqs.js","_app/immutable/chunks/o49wPE4K.js","_app/immutable/chunks/wKc8TgY5.js","_app/immutable/chunks/DvSTLXYt.js","_app/immutable/chunks/BKBDCzpW.js","_app/immutable/chunks/DqXJRMKf.js"];
export const stylesheets = ["_app/immutable/assets/10.DVC7Jk20.css"];
export const fonts = [];
