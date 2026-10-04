import { ICON_NODES } from './lucide-icons.mjs';

const entities = Object.freeze({ overview: 'house', gigs: 'music', schedule: 'calendar-days', contacts: 'users', companies: 'building-2', tasks: 'list-checks', finances: 'wallet', locations: 'map-pin', notes: 'sticky-note', documents: 'files', interactions: 'messages-square', services: 'briefcase', tags: 'tags', profile: 'user-round', history: 'history', settings: 'settings' });
export const entityIcon = (entity) => entities[entity] || 'database';
const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Decorative only: every use retains its adjacent visible text label.
export function icon(name) {
  const nodes = Object.hasOwn(ICON_NODES, name) ? ICON_NODES[name] : null;
  if (!nodes) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="ui-icon" data-icon="${safe(name)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${nodes.map(([tag, attributes]) => `<${tag} ${Object.entries(attributes).map(([key, value]) => `${key}="${safe(value)}"`).join(' ')}></${tag}>`).join('')}</svg>`;
}
