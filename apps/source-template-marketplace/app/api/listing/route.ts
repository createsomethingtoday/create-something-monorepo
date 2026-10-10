import { fetchListingContent } from '../../../lib/listingContent';
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug))
    return Response.json({ error: 'Invalid template slug' }, { status: 400 });
  try {
    return Response.json(await fetchListingContent(slug));
  } catch {
    return Response.json(
      { error: 'The original listing content could not be loaded. Retry or read it on Webflow.' },
      { status: 502 }
    );
  }
}
