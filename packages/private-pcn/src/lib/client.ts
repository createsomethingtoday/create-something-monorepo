export function supportHeaders(): Record<string, string> {
  const id =
    typeof document === 'undefined'
      ? ''
      : document.querySelector('meta[name="pcn-support-session"]')?.getAttribute('content');
  return id ? { 'X-PCN-Support-Session': id } : {};
}
export async function api(path: string, body?: unknown, networkSlug?: string) {
  const prefix = networkSlug ? `/api/networks/${encodeURIComponent(networkSlug)}` : '/api';
  const response = await fetch(
    `${prefix}/${path}`,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...supportHeaders() },
          body: JSON.stringify(body)
        }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}
export const BOOKING_URL =
  'https://schedule.createsomething.agency/createsomething/together?source=private-pcn&intent=private-content-network';
export interface CatalogVideo {
  id: string;
  title: string;
  description: string;
  series: string;
  access: string;
  visibility: string;
  ingest_status: string;
  duration: number | null;
}
