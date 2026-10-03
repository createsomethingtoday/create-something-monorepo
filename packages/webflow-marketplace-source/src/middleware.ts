import {defineMiddleware} from 'astro:middleware';
export const onRequest=defineMiddleware((context,next)=>{
 if(['/marketplace','/dashboard','/signup'].includes(context.url.pathname))return context.redirect('https://webflow.com'+context.url.pathname+context.url.search,302);
 return next();
});
