import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  DEFAULT_GUIDELINES_API_BASE,
  blockInnerHtml,
  fetchGuidelines,
  groupGuidelineBlocks,
  hashId,
  sectionScrollTarget,
  listItemInnerHtml,
  sanitizeGuidelineHtml,
  sectionForHash,
  type GuidelineSection,
  type GuidelinesDocument,
} from './submissionGuidelinesData';

export interface SubmissionGuidelinesProps {
  /** templates-api base (no trailing slash). Worker origins are rewritten to it. */
  apiBase?: string;
  /** Section id to open first (for example "required-pages"). Empty opens the first section. */
  defaultSection?: string;
  /** Keep the open section in the URL hash so sections and rules can be linked. */
  syncUrlHash?: boolean;
  /** Pre-loaded guidelines (tests and server rendering); skips the fetch. */
  initialDocument?: GuidelinesDocument;
}

const STYLES = `
.sguide, .sguide * { box-sizing: border-box; }
.sguide {
  display: flex;
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.6;
}
.sguide-menu {
  display: flex;
  flex-direction: column;
  flex: 0 0 400px;
  align-self: flex-start;
  margin-right: 60px;
  position: sticky;
  top: 80px;
}
.sguide-tab {
  appearance: none;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  font-variation-settings: "wght" 570, "opsz" 16;
  padding: 9px 28px;
  text-align: left;
}
.sguide-tab:hover { background: #f6f6ff; }
.sguide-tab[aria-selected="true"] { background: #f6f6ff; }
.sguide-tab:focus-visible { outline: 2px solid #146ef5; outline-offset: 2px; }
.sguide-content { flex: 1; min-width: 0; }
.sguide-content h2 { margin: 10px 0 20px; font-size: 24px; line-height: 1.3; }
.sguide-content h3 { margin: 16px 0 12px; font-size: 20px; line-height: 1.5; }
.sguide-content h4 { margin: 14px 0 10px; font-size: 18px; line-height: 1.5; }
.sguide-content p { margin: 0 0 12px; }
.sguide-content ul, .sguide-content ol { margin: 0 0 10px; padding-left: 40px; }
.sguide-content li { margin-bottom: 4px; line-height: 1.6; }
.sguide-content li ul, .sguide-content li ol { margin: 4px 0 0; }
.sguide-content blockquote { margin: 1rem 0; padding: 1rem 0 1rem 20px; border-left: 5px solid #e2e2e2; font-size: 1rem; }
.sguide-content a { color: inherit; text-decoration: underline; }
/* :target does not match inside a shadow root, so every rule anchor carries the nav offset. */
.sguide-content [id] { scroll-margin-top: 96px; }
.sguide-status { padding: 24px 0; color: #5a5a5a; }
@media (max-width: 991px) {
  .sguide { flex-direction: column; }
  .sguide-menu {
    flex-direction: row;
    flex: 0 0 auto;
    /* The desktop flex-start would size the row to all 13 labels and push the page sideways. */
    align-self: stretch;
    min-width: 0;
    max-width: 100%;
    margin: 0 0 24px;
    position: static;
    overflow-x: auto;
  }
  .sguide-tab { white-space: nowrap; }
}
`;

function SectionContent({ section }: { section: GuidelineSection }) {
  return (
    <>
      {groupGuidelineBlocks(section.blocks).map((group) => {
        if (group.type === 'heading') {
          const Tag = `h${group.level}` as 'h2' | 'h3' | 'h4';
          return (
            <Tag key={group.block.id} id={group.block.id}>
              {group.block.text}
            </Tag>
          );
        }
        if (group.type === 'html') {
          const Tag = group.tag;
          return (
            <Tag
              key={group.block.id}
              id={group.block.id}
              dangerouslySetInnerHTML={{ __html: sanitizeGuidelineHtml(blockInnerHtml(group.block)) }}
            />
          );
        }
        const List = group.ordered ? 'ol' : 'ul';
        return (
          <List key={group.blocks[0].id}>
            {group.blocks.map((block) => (
              <li
                key={block.id}
                id={block.id}
                dangerouslySetInnerHTML={{ __html: sanitizeGuidelineHtml(listItemInnerHtml(block)) }}
              />
            ))}
          </List>
        );
      })}
    </>
  );
}

export function SubmissionGuidelines({
  apiBase = DEFAULT_GUIDELINES_API_BASE,
  defaultSection = '',
  syncUrlHash = true,
  initialDocument,
}: SubmissionGuidelinesProps) {
  const [doc, setDoc] = useState<GuidelinesDocument | null>(initialDocument ?? null);
  const [failed, setFailed] = useState(false);
  const [activeId, setActiveId] = useState<string>(() => {
    const sections = initialDocument?.sections ?? [];
    return sections.find((s) => s.id === defaultSection)?.id ?? sections[0]?.id ?? '';
  });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();
  // The window the component is rendered in. In the Designer the script runs in the
  // outer window while the component renders inside the canvas iframe.
  const ownView = () => rootRef.current?.ownerDocument.defaultView ?? window;
  // Set by a user section change; the scroll runs once the new section has rendered.
  const scrollAfterRender = useRef(false);

  useEffect(() => {
    if (initialDocument) return;
    let cancelled = false;
    fetchGuidelines(apiBase)
      .then((loaded) => {
        if (cancelled) return;
        setDoc(loaded);
        const fromHash = syncUrlHash && typeof window !== 'undefined' ? sectionForHash(loaded, ownView().location.hash) : null;
        const preferred = loaded.sections.find((s) => s.id === defaultSection)?.id;
        setActiveId(fromHash ?? preferred ?? loaded.sections[0]?.id ?? '');
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, defaultSection, initialDocument, syncUrlHash]);

  // Like the original tabs: a section picked from lower on the page opens at its top.
  // Measured after render so the target reflects the new section's layout.
  useEffect(() => {
    if (!scrollAfterRender.current) return;
    scrollAfterRender.current = false;
    const view = ownView();
    const top = rootRef.current?.getBoundingClientRect().top;
    const target = top === undefined ? null : sectionScrollTarget(top, view.scrollY);
    if (target === null) return;
    const reduceMotion = view.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    view.scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [activeId]);

  // A link to a single rule (#required-pages-08) opens its section, then scrolls to it.
  useEffect(() => {
    if (!doc || !syncUrlHash || typeof window === 'undefined') return;
    const view = ownView();
    const target = hashId(view.location.hash);
    if (!target || doc.sections.some((s) => s.id === target)) return;
    // Rules render inside the component's shadow root, which document.getElementById cannot see.
    const scope = (rootRef.current?.getRootNode() ?? view.document) as Document | ShadowRoot;
    view.requestAnimationFrame(() => scope.getElementById(target)?.scrollIntoView({ block: 'start' }));
  }, [doc, syncUrlHash]);

  const select = useCallback(
    (id: string) => {
      setActiveId(id);
      if (typeof window === 'undefined') return;
      if (syncUrlHash) ownView().history.replaceState(null, '', `#${id}`);
      scrollAfterRender.current = true;
    },
    [syncUrlHash],
  );

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!doc) return;
    const last = doc.sections.length - 1;
    const next =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? index === last ? 0 : index + 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? index === 0 ? last : index - 1
          : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (next === null) return;
    event.preventDefault();
    select(doc.sections[next].id);
    tabRefs.current[next]?.focus();
  };

  if (failed) {
    return (
      <div className="sguide-status" role="alert" ref={rootRef}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        The submission guidelines could not load. Refresh the page to try again.
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="sguide-status" aria-busy="true" ref={rootRef}>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
        Loading the submission guidelines…
      </div>
    );
  }

  const active = doc.sections.find((s) => s.id === activeId) ?? doc.sections[0];
  return (
    <div className="sguide" ref={rootRef} data-guidelines-version={doc.version}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="sguide-menu" role="tablist" aria-orientation="vertical" aria-label="Guideline sections">
        {doc.sections.map((section, index) => (
          <button
            key={section.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${section.id}`}
            aria-selected={section.id === active?.id}
            aria-controls={`${baseId}-panel`}
            tabIndex={section.id === active?.id ? 0 : -1}
            className="sguide-tab"
            onClick={() => select(section.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {section.name}
          </button>
        ))}
      </div>
      {active ? (
        <div
          className="sguide-content"
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active.id}`}
          tabIndex={0}
        >
          <SectionContent section={active} />
        </div>
      ) : null}
    </div>
  );
}
