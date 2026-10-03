'use client';
import { useEffect, useRef, useState } from 'react';
import { PREVIEW_IFRAME_SANDBOX, safePreviewUrl } from '../lib/templateUrlSafety';
export function PreviewDialog({
  name,
  url,
  close
}: {
  name: string;
  url: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [width, setWidth] = useState('100%');
  const safeUrl = safePreviewUrl(url);
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    node?.querySelector<HTMLButtonElement>('header > button')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  if (!safeUrl) return null;
  return (
    <dialog
      ref={dialog}
      className="preview-dialog"
      aria-labelledby="preview-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="preview-title">{name} preview</h2>
        <div className="preview-sizes" aria-label="Preview width">
          {[
            ['Desktop', '100%'],
            ['Tablet', '768px'],
            ['Mobile', '390px']
          ].map(([label, value]) => (
            <button key={label} aria-pressed={width === value} onClick={() => setWidth(value)}>
              {label}
            </button>
          ))}
        </div>
        <a className="preview-external" href={safeUrl} target="_blank" rel="noreferrer">
          Open live site
        </a>
        <button onClick={close} autoFocus>
          Close preview
        </button>
      </header>
      <div className="preview-viewport">
        <iframe
          style={{ width }}
          title={`${name} live website`}
          src={safeUrl}
          sandbox={PREVIEW_IFRAME_SANDBOX}
        />
      </div>
      <p>
        If the site prevents embedding,{' '}
        <a href={safeUrl} target="_blank" rel="noreferrer">
          open the live preview in a new tab
        </a>
        .
      </p>
    </dialog>
  );
}
