import { marketplaceMetadata } from '../../lib/metadata';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Marketplace from '../../components/Marketplace';
export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return marketplaceMetadata((await params).path || [], await searchParams);
}
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (
    !(
      path.length === 0 ||
      (path[0] === 'templates' &&
        (path.length === 1 ||
          (path.length === 2 && path[1] === 'all') ||
          (path.length === 3 && path[1] === 'html')))
    )
  )
    notFound();
  return (
    <Suspense fallback={<main>Loading Marketplace…</main>}>
      <Marketplace />
    </Suspense>
  );
}
