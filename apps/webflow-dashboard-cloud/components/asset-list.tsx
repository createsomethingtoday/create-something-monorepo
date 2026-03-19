'use client';

import type { Asset } from '@create-something/webflow-dashboard-core/airtable';
import { useMemo, useState } from 'react';
import { appPath } from '../lib/runtime-paths';

function statusMeta(status: Asset['status']) {
  return {
    label: status || 'Draft'
  };
}

export function AssetList({ assets }: { assets: Asset[] }) {
  const [search, setSearch] = useState('');

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;

    return assets.filter((asset) => {
      return [
        asset.name,
        asset.category,
        asset.subcategory,
        asset.status,
        asset.websiteUrl,
        asset.previewUrl
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [assets, search]);

  return (
    <div className="card">
      <div className="page-header">
        <div>
          <h2 className="card-title">Asset portfolio</h2>
          <p className="card-subtitle">Search, review, and open the assets attached to your creator account.</p>
        </div>
        <input
          className="field-input"
          style={{ maxWidth: '18rem' }}
          type="search"
          placeholder="Search assets…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="asset-list" style={{ marginTop: '1rem' }}>
        {filteredAssets.length === 0 ? (
          <div className="notice">No assets match the current search.</div>
        ) : (
          filteredAssets.map((asset) => {
            const meta = statusMeta(asset.status);
            return (
              <article className="asset-row" key={asset.id}>
                <div className="asset-row-top">
                  <div>
                    <h3 className="asset-name">{asset.name}</h3>
                    <p className="asset-meta">
                      <span>{asset.category || 'Uncategorized'}</span>
                      {asset.subcategory ? <span>{asset.subcategory}</span> : null}
                      {asset.publishedDate ? <span>Published {asset.publishedDate}</span> : null}
                    </p>
                  </div>
                  <span className="status-badge" data-status={asset.status}>
                    {meta.label}
                  </span>
                </div>

                <div className="form-actions">
                  <a className="button-link button-primary" href={appPath(`/assets/${asset.id}`)}>
                    Open asset
                  </a>
                  {asset.websiteUrl ? (
                    <a className="button-link button-secondary" href={asset.websiteUrl} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  ) : null}
                  {asset.previewUrl ? (
                    <a className="button-link button-secondary" href={asset.previewUrl} target="_blank" rel="noreferrer">
                      Preview
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
