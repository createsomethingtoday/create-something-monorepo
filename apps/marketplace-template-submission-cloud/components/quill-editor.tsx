'use client';

import { useEffect, useRef } from 'react';
import type Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
}

const EMIT_DEBOUNCE_MS = 200;

export function QuillEditor({ value, onChange, placeholder, id }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const lastEmittedValueRef = useRef<string | null>(null);
  const emitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;

    const quill = quillRef.current;
    if (!quill) return;

    const sanitizedValue = sanitizeLongDescriptionHtml(value);
    if (sanitizedValue === lastEmittedValueRef.current) {
      lastEmittedValueRef.current = null;
      return;
    }
    lastEmittedValueRef.current = null;

    const currentValue = sanitizeLongDescriptionHtml(quill.getSemanticHTML());
    if (sanitizedValue !== currentValue) {
      syncEditorHtml(quill, sanitizedValue);
    }
  }, [value]);

  useEffect(() => {
    let disposed = false;
    let handler: (() => void) | null = null;
    let flushEmit: (() => void) | null = null;

    // Quill is bundled but loaded on demand so it stays out of the page's
    // initial JS payload.
    import('quill')
      .then(({ default: QuillCtor }) => {
        if (disposed || !containerRef.current) return;
        if (quillRef.current) return;

        let quill: Quill | null = null;
        const emitChange = () => {
          if (emitTimeoutRef.current !== null) {
            window.clearTimeout(emitTimeoutRef.current);
            emitTimeoutRef.current = null;
          }
          if (!quill) return;
          normalizeEditorImages(quill.root);
          const sanitizedHtml = sanitizeLongDescriptionHtml(quill.root.innerHTML);
          lastEmittedValueRef.current = sanitizedHtml;
          onChangeRef.current(sanitizedHtml);
        };

        // Serializing and sanitizing the whole document on every keystroke is
        // expensive for long descriptions, so changes are emitted on a short
        // trailing debounce and flushed when the editor loses focus.
        const scheduleEmit = () => {
          if (emitTimeoutRef.current !== null) {
            window.clearTimeout(emitTimeoutRef.current);
          }
          emitTimeoutRef.current = window.setTimeout(emitChange, EMIT_DEBOUNCE_MS);
        };

        flushEmit = () => {
          if (emitTimeoutRef.current === null) return;
          emitChange();
        };

        quill = new QuillCtor(containerRef.current, {
          theme: 'snow',
          placeholder,
          // Quill 2 folds ordered/bullet into the single 'list' format.
          formats: ['header', 'bold', 'italic', 'list', 'link', 'image'],
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

        if (valueRef.current) {
          const sanitizedValue = sanitizeLongDescriptionHtml(valueRef.current);
          syncEditorHtml(quill, sanitizedValue);
        }

        handler = scheduleEmit;
        quill.on('text-change', handler);
        quill.root.addEventListener('blur', flushEmit);
        quillRef.current = quill;
      })
      .catch(() => {
        /* fail silently; fallback markup stays visible */
      });

    return () => {
      disposed = true;
      flushEmit?.();
      if (quillRef.current && handler) {
        try {
          quillRef.current.off('text-change', handler);
          if (flushEmit) {
            quillRef.current.root.removeEventListener('blur', flushEmit);
          }
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

function syncEditorHtml(quill: Quill, value: string): void {
  // Values reach this boundary only after sanitization. Use Quill's public
  // import path so its Delta model stays aligned with the rendered document.
  quill.clipboard.dangerouslyPasteHTML(value, 'silent');
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
