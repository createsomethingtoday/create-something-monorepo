'use client';

import { useEffect, useRef } from 'react';

const QUILL_CSS = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
const QUILL_JS = 'https://cdn.quilljs.com/1.3.6/quill.min.js';

type QuillInstance = {
  root: HTMLElement;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  getContents: () => { ops: { insert?: unknown }[] };
  deleteText: (index: number, length: number, source?: string) => void;
  getLength: () => number;
  setContents: (contents: unknown, source?: string) => void;
  clipboard: {
    convert: (html?: string) => unknown;
  };
};

declare global {
  interface Window {
    Quill?: new (el: HTMLElement, opts: unknown) => QuillInstance;
  }
}

function normalizeEditorHtml(value: string | undefined): string {
  return (value || '')
    .replace(/<p><br><\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureQuillAssetsLoaded(): Promise<typeof window.Quill> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Quill) return Promise.resolve(window.Quill);

  if (!document.querySelector(`link[href="${QUILL_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = QUILL_CSS;
    document.head.appendChild(link);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${QUILL_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Quill));
      existing.addEventListener('error', () => reject(new Error('Quill failed to load')));
      if (window.Quill) resolve(window.Quill);
      return;
    }
    const script = document.createElement('script');
    script.src = QUILL_JS;
    script.async = true;
    script.onload = () => resolve(window.Quill);
    script.onerror = () => reject(new Error('Quill failed to load'));
    document.head.appendChild(script);
  });
}

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
}

export function QuillEditor({ value, onChange, placeholder, id }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const syncingRef = useRef(false);
  const syncFrameRef = useRef<number | null>(null);

  function syncEditorHtml(quill: QuillInstance, html: string) {
    syncingRef.current = true;
    if (syncFrameRef.current !== null) {
      window.cancelAnimationFrame(syncFrameRef.current);
    }
    quill.setContents(quill.clipboard.convert(html || ''), 'silent');
    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncingRef.current = false;
      syncFrameRef.current = null;
    });
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let handler: (() => void) | null = null;

    ensureQuillAssetsLoaded()
      .then((Quill) => {
        if (disposed || !Quill || !containerRef.current) return;
        if (quillRef.current) return;

        const quill = new Quill(containerRef.current, {
          theme: 'snow',
          placeholder,
          modules: {
            toolbar: [
              ['bold', 'italic'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['clean']
            ]
          }
        });

        if (valueRef.current) {
          syncEditorHtml(quill, valueRef.current);
        }

        handler = () => {
          if (syncingRef.current) return;

          // Strip any image ops
          const delta = quill.getContents();
          let hasImages = false;
          for (const op of delta.ops) {
            if (op.insert && typeof op.insert === 'object' && 'image' in (op.insert as object)) {
              hasImages = true;
              break;
            }
          }
          if (hasImages) {
            const len = quill.getLength();
            const filteredHtml = quill.root.innerHTML.replace(/<img[^>]*>/g, '');
            syncEditorHtml(quill, filteredHtml);
            quill.deleteText(len, 0, 'silent');
            onChangeRef.current(filteredHtml);
            return;
          }
          onChangeRef.current(quill.root.innerHTML);
        };
        quill.on('text-change', handler);
        quillRef.current = quill;
      })
      .catch(() => {
        /* fail silently; fallback markup stays visible */
      });

    return () => {
      disposed = true;
      if (quillRef.current && handler) {
        try {
          quillRef.current.off('text-change', handler);
        } catch {
          // ignore
        }
      }
      if (syncFrameRef.current !== null) {
        window.cancelAnimationFrame(syncFrameRef.current);
      }
      syncingRef.current = false;
      syncFrameRef.current = null;
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    valueRef.current = value;

    const quill = quillRef.current;
    if (!quill) return;

    const nextHtml = value || '';
    if (normalizeEditorHtml(quill.root.innerHTML) === normalizeEditorHtml(nextHtml)) {
      return;
    }

    syncEditorHtml(quill, nextHtml);
  }, [value]);

  return <div id={id} ref={containerRef} className="submission-quill" />;
}
