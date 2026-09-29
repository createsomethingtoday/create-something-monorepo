'use client';
import { useEffect, useState } from 'react';
import type { ListingContent } from '../lib/listingContent';

export function ListingSections({ slug, listing }: { slug: string; listing: string | null }) {
  const [data, setData] = useState<ListingContent | null>(null);
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/listing?slug=' + encodeURIComponent(slug), { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body;
      })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [slug, attempt]);
  if (error)
    return (
      <section className="content-error" role="alert">
        <h2>Original description unavailable</h2>
        <p>{error}</p>
        <button onClick={() => retry((n) => n + 1)}>Retry description</button>
        {listing && (
          <a href={listing} target="_blank" rel="noreferrer">
            Read the original listing
          </a>
        )}
      </section>
    );
  if (!data)
    return (
      <p role="status" className="content-loading">
        Loading the creator’s original description…
      </p>
    );
  return (
    <div className="listing-content">
      <nav className="detail-sections" aria-label="Template information">
        <a href="#overview">Overview</a>
        {data.license && <a href="#license">License</a>}
        {data.support && <a href="#support">Support</a>}
        {!!data.faq.length && <a href="#faq">FAQ</a>}
      </nav>
      <section id="overview">
        <h2 className="section-title">About this template</h2>
        <div className="rich-text" dangerouslySetInnerHTML={{ __html: data.overview }} />
      </section>
      {!!data.features.length && (
        <section id="features">
          <h2>Template features</h2>
          <div className="feature-list">
            {data.features.map((f, i) => (
              <details key={f.title + i}>
                <summary>{f.title}</summary>
                <div className="rich-text" dangerouslySetInnerHTML={{ __html: f.html }} />
              </details>
            ))}
          </div>
        </section>
      )}
      {data.license && (
        <section id="license">
          <h2>License</h2>
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: data.license }} />
        </section>
      )}
      {data.support && (
        <section id="support">
          <h2>Creator support</h2>
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: data.support }} />
        </section>
      )}
      {!!data.faq.length && (
        <section id="faq">
          <h2>Frequently asked questions</h2>
          {data.faq.map((f, i) => (
            <details key={f.title + i}>
              <summary>{f.title}</summary>
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: f.html }} />
            </details>
          ))}
        </section>
      )}
      <p className="provenance">
        Creator description and listing information from{' '}
        <a href={data.source} target="_blank" rel="noreferrer">
          Webflow
        </a>
        . Retrieved {new Date(data.fetchedAt).toLocaleDateString()}.
      </p>
    </div>
  );
}
