import { catalogUrl } from '../../../lib/catalog';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const target = catalogUrl(new URL(request.url).searchParams);
  try {
    const response = await fetch(target, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items) || !data.pagination) throw new Error('Invalid catalog response');
    return Response.json(
      {
        ...data,
        provenance: { source: target.toString(), fetchedAt: new Date().toISOString(), mode: 'live' }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return Response.json(
      { error: 'The catalog could not be reached. Please try again.' },
      { status: 502 }
    );
  }
}
