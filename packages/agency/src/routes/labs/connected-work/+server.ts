import html from '$lib/content/connected-work.html?raw';

// A standalone, static illustration; it does not inherit the Agency application shell.
export const prerender = true;
export const trailingSlash = 'always';

// SvelteKit prerender recognizes HTML only with this exact media type.
// The document declares UTF-8 in its first meta tag.
export function GET() {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
