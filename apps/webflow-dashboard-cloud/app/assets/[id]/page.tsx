import { notFound } from 'next/navigation';
import { AssetEditor } from '../../../components/asset-editor';
import { getServerAirtable } from '../../../lib/server/airtable';
import { requireUser } from '../../../lib/server/session';

export const dynamic = 'force-dynamic';

export default async function AssetPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const airtable = await getServerAirtable();
  const isOwner = await airtable.verifyAssetOwnership(id, user.email);

  if (!isOwner) {
    return (
      <main className="container">
        <div className="page-stack">
          <div className="notice notice-error">You do not have permission to view this asset.</div>
        </div>
      </main>
    );
  }

  const asset = await airtable.getAsset(id);
  if (!asset) {
    notFound();
  }

  const resolvedAsset = asset;

  return (
    <main className="container">
      <div className="page-stack">
        <section className="page-header">
          <div>
            <h1 className="page-title">{resolvedAsset.name}</h1>
            <p className="page-subtitle">
              Review submission copy, marketplace imagery, and destination links for this asset.
            </p>
          </div>
        </section>

        <AssetEditor asset={resolvedAsset} />
      </div>
    </main>
  );
}
