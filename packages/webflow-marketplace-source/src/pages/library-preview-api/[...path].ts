import type {APIRoute} from 'astro';
/** No proxy around the owning app's CSRF, Turnstile or delivery boundaries. */
export const POST:APIRoute=()=>new Response(JSON.stringify({error:'Development preview: backend checks, uploads and deliveries are disabled. Production uses the existing Library submission app.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
