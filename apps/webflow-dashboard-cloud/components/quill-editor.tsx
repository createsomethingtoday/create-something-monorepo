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
};

declare global {
  interface Window {
    Quill?: new (element: HTMLElement, options: unknown) => QuillInstance;
  }
}

function ensureQuillAssetsLoaded(): Promise<typeof window.Quill> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'));
  }

  if (window.Quill) {
    return Promise.resolve(window.Quill);
  }

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
      if (window.Quill) {
        resolve(window.Quill);
      }
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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let handler: (() => void) | null = null;

    ensureQuillAssetsLoaded()
      .then((Quill) => {
        if (disposed || !Quill || !containerRef.current || quillRef.current) {
          return;
        }

        const quill = new Quill(containerRef.current, {
          theme: 'snow',
          placeholder,
          modules: {
            toolbar: [
              ['bold', 'italic'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['clean'],
            ],
          },
        });

        if (value) {
          quill.root.innerHTML = value;
        }

        handler = () => {
          const delta = quill.getContents();
          let hasImages = false;
          for (const op of delta.ops) {
            if (op.insert && typeof op.insert === 'object' && 'image' in (op.insert as object)) {
              hasImages = true;
              break;
            }
          }

          if (hasImages) {
            const length = quill.getLength();
            const filteredHtml = quill.root.innerHTML.replace(/<img[^>]*>/g, '');
            quill.root.innerHTML = filteredHtml;
            quill.deleteText(length, 0, 'silent');
          }

          onChangeRef.current(quill.root.innerHTML);
        };

        quill.on('text-change', handler);
        quillRef.current = quill;
      })
      .catch(() => {
        // Keep the rest of the form usable if Quill fails to load.
      });

    return () => {
      disposed = true;
      if (quillRef.current && handler) {
        try {
          quillRef.current.off('text-change', handler);
        } catch {
          // ignore cleanup errors from a partially initialized editor
        }
      }
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={id} ref={containerRef} className="submission-quill" />;
}
