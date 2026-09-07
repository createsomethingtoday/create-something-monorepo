import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

export const subject = '“Deployed” is only one step';
export const scheduledAt = '2026-09-10T14:00:00Z';
export const heroPath = fileURLToPath(new URL('../../../static/images/newsletters/deployed-is-only-one-step/hero.png', import.meta.url));
const source = fs.readFileSync(new URL('./email.md', import.meta.url), 'utf8');
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function render({ unsubscribeUrl, test = false, imageSrc = 'cid:thursday-proof-hero' }) {
  const unsubscribe = new URL(unsubscribeUrl);
  if (unsubscribe.origin !== 'https://createsomething.io' || unsubscribe.pathname !== '/unsubscribe' ||
      (test ? unsubscribe.searchParams.get('preview') !== 'operator-seed' : !unsubscribe.searchParams.get('token'))) {
    throw new Error('A valid, mode-specific unsubscribe URL is required');
  }
  const md = test ? source.replaceAll('utm_content=primary-cta', 'utm_content=primary-cta&traffic_class=test') : source;
  let body = marked.parse(md)
    .replaceAll('<h1>', '<h1 style="font:400 36px/1.15 Georgia,serif;margin:0 0 24px;color:#181312">')
    .replaceAll('<h2>', '<h2 style="font:400 27px/1.2 Georgia,serif;margin:32px 0 16px;color:#181312">')
    .replaceAll('<h3>', '<h3 style="font:400 22px/1.25 Georgia,serif;margin:26px 0 12px;color:#181312">')
    .replaceAll('<p>', '<p style="font:17px/1.65 Arial,sans-serif;margin:0 0 18px;color:#2e2927">')
    .replaceAll('<li>', '<li style="font:17px/1.65 Arial,sans-serif;margin-bottom:10px;color:#2e2927">')
    .replaceAll('<a href=', '<a style="color:#181312;text-decoration:underline" href=')
    .replace('</h1>', `</h1><img src="${escape(imageSrc)}" width="620" alt="An artifact and receipt connect to a browser frame, where a lens checks the result at its destination." style="display:block;width:100%;max-width:620px;height:auto;margin:0 0 24px;border:0">`);
  const footer = test ? 'Operator test requested by Micah. This unsubscribe preview does not change subscription preferences.' : 'You received this because you subscribed to CREATE SOMETHING.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head><body style="margin:0;padding:0;background:#d8cdbc"><div style="display:none;max-height:0;overflow:hidden">A receipt proves one state. Plus: Source, Fable 5.1, and Webflow’s announced agent tooling.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr><td align="center" style="padding:20px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;table-layout:fixed;border-collapse:collapse"><tr><td style="background:#181312;color:#f3ebe4;border-bottom:4px solid #fcaa2d;padding:20px;font:12px Arial,sans-serif">CREATE SOMETHING / FIELD NOTE / SEPTEMBER 10, 2026${test ? ' / OPERATOR TEST' : ''}</td></tr><tr><td style="background:#f3ebe4;padding:28px 24px;overflow-wrap:anywhere">${body}</td></tr><tr><td style="background:#181312;color:#f3ebe4;padding:24px;font:12px/1.6 Arial,sans-serif">CREATE SOMETHING<br>${footer}<br><a href="${escape(unsubscribeUrl)}" style="color:#fcaa2d;text-decoration:underline">${test ? 'Unsubscribe preview' : 'Unsubscribe'}</a></td></tr></table></td></tr></table></body></html>`;
  const text = (test ? 'OPERATOR TEST\n\n' : '') + md.replace(/^#{1,3} /gm, '').replaceAll('**', '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)') + `\n${footer}\n${test ? 'Unsubscribe preview' : 'Unsubscribe'}: ${unsubscribeUrl}\n`;
  if (html.includes('{{') || text.includes('{{')) throw new Error('Unresolved template field');
  return { html, text };
}
