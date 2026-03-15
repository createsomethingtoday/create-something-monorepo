import * as server from '../entries/pages/admin/community/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/community/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/community/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.CizWO1b4.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/tsl3k0Gx.js","_app/immutable/chunks/DphI8CAr.js","_app/immutable/chunks/xPDz-uK9.js","_app/immutable/chunks/D97XJfqs.js","_app/immutable/chunks/o49wPE4K.js","_app/immutable/chunks/BP6bmI2w.js","_app/immutable/chunks/ygKXnOhL.js","_app/immutable/chunks/wKc8TgY5.js","_app/immutable/chunks/DvSTLXYt.js","_app/immutable/chunks/BKBDCzpW.js","_app/immutable/chunks/DqXJRMKf.js","_app/immutable/chunks/rvdPyPRp.js","_app/immutable/chunks/jQ8LPxYY.js"];
export const stylesheets = ["_app/immutable/assets/Card.D8vkmRM_.css","_app/immutable/assets/6.B_-2yhku.css"];
export const fonts = [];
