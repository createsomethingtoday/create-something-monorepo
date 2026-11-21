import type { CanonTaskSceneKey } from '$lib/canon-task-scenes';
export type JournalIllustration = 'inspection' | 'exception-tray' | 'research-trace' | 'field-note' | 'connected-tools' | 'reference-index';
const descriptions = {
  inspection: { alt: 'Canon studies a punched paper strip beneath a brass lens.', caption: 'Inspecting the work' },
  'exception-tray': { alt: 'A marked paper strip rests in a ceramic tray beside the inspection point.', caption: 'Setting aside an exception' },
  'research-trace': { alt: 'Canon points a brass pencil at the extra peak on the second paper trace.', caption: 'Comparing the expected trace with what happened' },
  'field-note': { alt: 'Canon places a paper field note into an ivory envelope on the workshop table.', caption: 'A field note, ready to share' },
  'reference-index': { alt: 'Canon sorts ivory reference cards into a small ceramic index on a pale oak table.', caption: 'A working index of references' },
  'connected-tools': { alt: 'An ivory paper reel connects to a brass-guided inspection tool on a pale oak table.', caption: 'A connection between tools' }
};
/** These exact public assets are served by the private .io Webflow Cloud source. */
export function journalArtwork(scene: CanonTaskSceneKey, selected?: JournalIllustration) {
  const name = selected ?? (scene === 'modular-port' ? 'connected-tools' : scene === 'review-nook' ? 'inspection' : scene === 'evidence-comparison' || scene === 'evidence-unknowns' ? 'exception-tray' : 'research-trace');
  const responsive = name === 'field-note' || name === 'connected-tools' || name === 'reference-index';
  return { ...descriptions[name], src: `/images/${name}${responsive ? '-1280' : name === 'research-trace' ? '-1536' : ''}.webp`,
    srcset: responsive ? `/images/${name}-640.webp 640w, /images/${name}-1280.webp 1280w` : undefined,
    width: responsive ? 1280 : 1536, height: responsive ? 720 : 1024 };
}
