'use client';

import { useEffect, useRef } from 'react';
import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

const QUILL_CSS = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
const QUILL_JS = 'https://cdn.quilljs.com/1.3.6/quill.min.js';

type QuillInstance = {
  root: HTMLElement;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  getSelection: (focus?: boolean) => { index: number; length: number } | null;
  insertEmbed: (index: number, type: string, value: string, source?: string) => void;
  setSelection: (index: number, length?: number, source?: string) => void;
  getLength: () => number;
};

declare global {
  interface Window {
    Quill?: new (el: HTMLElement, opts: unknown) => QuillInstance;
  }
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

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    const sanitizedValue = sanitizeLongDescriptionHtml(value);
    if (sanitizedValue !== quill.root.innerHTML) {
      quill.root.innerHTML = sanitizedValue;
    }
  }, [value]);

  useEffect(() => {
    let disposed = false;
    let handler: (() => void) | null = null;

    ensureQuillAssetsLoaded()
      .then((Quill) => {
        if (disposed || !Quill || !containerRef.current) return;
        if (quillRef.current) return;

        let quill: QuillInstance | null = null;
        const emitChange = () => {
          if (!quill) return;
          normalizeEditorImages(quill.root);
          const sanitizedHtml = sanitizeLongDescriptionHtml(quill.root.innerHTML);
          onChangeRef.current(sanitizedHtml);
        };

        quill = new Quill(containerRef.current, {
          theme: 'snow',
          placeholder,
          formats: ['header', 'bold', 'italic', 'list', 'bullet', 'link', 'image'],
          modules: {
            toolbar: {
              container: [
                [{ header: [3, 4, 5, 6, false] }],
                ['bold', 'italic'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean']
              ],
              handlers: {
                image: () => {
                  if (!quill) return;

                  const rawUrl = window.prompt('Image URL');
                  const imageUrl = normalizeExternalImageUrl(rawUrl || '');
                  if (!imageUrl) return;

                  const altText = window.prompt('Alt text') || '';
                  const range = quill.getSelection(true) || {
                    index: Math.max(0, quill.getLength() - 1),
                    length: 0
                  };
                  quill.insertEmbed(range.index, 'image', imageUrl, 'user');
                  quill.setSelection(range.index + 1, 0, 'silent');

                  window.setTimeout(() => {
                    const inserted = Array.from(quill?.root.querySelectorAll('img') || []).find(
                      (image) => image.getAttribute('src') === imageUrl || image.src === imageUrl
                    );
                    inserted?.setAttribute('alt', altText.trim());
                    inserted?.setAttribute('loading', 'lazy');
                    emitChange();
                  }, 0);
                }
              }
            }
          }
        });
        labelToolbarControls(containerRef.current);

        if (value) {
          const sanitizedValue = sanitizeLongDescriptionHtml(value);
          quill.root.innerHTML = sanitizedValue;
        }

        handler = emitChange;
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
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={id} ref={containerRef} className="submission-quill" />;
}

function normalizeExternalImageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeEditorImages(root: HTMLElement): void {
  for (const image of Array.from(root.querySelectorAll('img'))) {
    const imageUrl = normalizeExternalImageUrl(image.getAttribute('src') || image.src || '');
    if (!imageUrl) {
      image.remove();
      continue;
    }

    image.setAttribute('src', imageUrl);
    image.setAttribute('loading', 'lazy');
    if (!image.hasAttribute('alt')) {
      image.setAttribute('alt', '');
    }
    image.removeAttribute('style');
    image.removeAttribute('class');
    for (const attr of Array.from(image.attributes)) {
      if (attr.name.startsWith('on')) image.removeAttribute(attr.name);
    }
  }
}

function labelToolbarControls(container: HTMLElement): void {
  const toolbar = container.parentElement?.querySelector('.ql-toolbar');
  if (!toolbar) return;

  const controls = [
    ['.ql-header .ql-picker-label', 'Text style'],
    ['button.ql-bold', 'Bold'],
    ['button.ql-italic', 'Italic'],
    ['button.ql-list[value="ordered"]', 'Numbered list'],
    ['button.ql-list[value="bullet"]', 'Bulleted list'],
    ['button.ql-link', 'Add link'],
    ['button.ql-image', 'Add image URL'],
    ['button.ql-clean', 'Clear formatting']
  ] as const;

  for (const [selector, label] of controls) {
    const control = toolbar.querySelector<HTMLElement>(selector);
    if (!control) continue;
    control.setAttribute('aria-label', label);
    control.setAttribute('title', label);
  }
}
