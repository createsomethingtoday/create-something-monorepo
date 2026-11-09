import React from 'react';
import { B, HStack, Text } from './components.jsx';
import { sections } from '../web/model.mjs';
import { ICON_NODES } from '../web/lucide-icons.mjs';
import './dev-navigation.css';

// Keep Danny's workspace organization in the active React renderer. Native
// disclosures use installReferenceMenu's tested keyboard and dismissal contract.
const groups = [
  ['Work', [['gigs', 'Gigs'], ['music', 'Music'], ['finances', 'Money'], ['services', 'Services']]],
  ['Admin', [['tasks', 'Tasks'], ['schedule', 'Schedule'], ['notes', 'Notes'], ['documents', 'Documents'], ['tags', 'Tags']]],
  ['Network', [['contacts', 'People'], ['companies', 'Companies'], ['locations', 'Places'], ['interactions', 'Interactions']]],
  ['Platform', [['profile', 'Profile'], ['history', 'History'], ['appearance', 'Appearance'], ['settings', 'Settings'], ['appearance', 'Customize', 'preference-startPage'], ['settings', 'Safety', 'workspace-safety']]]
];
const icons = {
  gigs: 'calendar-days', music: 'music', finances: 'wallet', services: 'briefcase',
  tasks: 'list-checks', schedule: 'calendar-days', notes: 'sticky-note', documents: 'files',
  tags: 'tags', contacts: 'users', companies: 'building-2', locations: 'map-pin',
  interactions: 'messages-square', profile: 'user-round', history: 'history',
  appearance: 'settings', settings: 'settings', social: 'files'
};

function Icon({ name }) {
  return (
    <svg className="gigi-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(ICON_NODES[name] || ICON_NODES.files).map(([tag, attrs], index) =>
        React.createElement(tag, { ...attrs, key: index })
      )}
    </svg>
  );
}

export function DevNavigation({ ctx }) {
  const s = ctx.state;
  const known = new Set([...sections.map(({ id }) => id), 'appearance']);
  const grouped = new Set(['overview', ...groups.flatMap(([, items]) => items.map(([id]) => id))]);
  const additional = sections.filter(({ id }) => !grouped.has(id)).map(({ id, label }) => [id, label]);
  const unread = ctx.attention?.unreadCount || 0;
  return (
    <header className="gigi-dev-topbar reference-header">
      <HStack gap={0} className="reference-history">
        <B size="md" variant="ghost" data-workspace-history="-1" disabled={!ctx.workspaceHistory.target(-1)} label="Previous page" title="Previous page (Command-[)" isIconOnly icon={<Text as="span" color="inherit" aria-hidden="true">‹</Text>} />
        <B size="md" variant="ghost" data-workspace-history="1" disabled={!ctx.workspaceHistory.target(1)} label="Next page" title="Next page (Command-])" isIconOnly icon={<Text as="span" color="inherit" aria-hidden="true">›</Text>} />
      </HStack>
      <B size="md" variant="ghost" className="reference-brand" data-page="overview" label="GiGi Today"><Text as="span" color="inherit">GiGi</Text></B>
      <B size="md" variant="ghost" className="reference-find" data-workspace-search="1" label="Search workspace" aria-haspopup="dialog" aria-expanded={ctx.workspaceSearch.visible} title="Search workspace (Command-F)" icon={<Icon name="search" />}>
        <Text as="span" color="inherit" className="gigi-nav-search-label">Search</Text>
        <kbd>⌘F</kbd>
      </B>
      <nav className="reference-nav" aria-label="Workspace pages">
        <B size="md" variant="ghost" className="reference-today" data-page="overview" label="Today" aria-current={s.page === 'overview' ? 'page' : undefined} icon={<Text as="span" color="inherit" className="reference-date" data-today-date="" aria-hidden="true">{new Date().getDate()}</Text>}>Today</B>
        {groups.map(([name, items]) => {
          const entries = [...items, ...(name === 'Work' ? additional : [])].filter(([id]) => known.has(id));
          const selected = entries.some(([id]) => s.page === id);
          return (
            <details key={name} className="reference-dropdown" name="workspace-navigation" data-nav-menu={name} data-view-key={`reference-${name.toLowerCase()}`}>
              <summary data-nav-overflow={name} className={selected ? 'selected' : undefined}>
                <Text as="span" type="label" color="inherit">{name}</Text><Text as="span" color="inherit" className="reference-chevron" aria-hidden="true">⌄</Text>
              </summary>
              <nav className="reference-menu reference-menu-group" aria-label={name}>
                {entries.map(([id, label, target]) => (
                  <B key={`${id}:${target || ''}`} size="md" variant="ghost" data-page={id} data-nav-target={target} aria-current={s.page === id && !target ? 'page' : undefined} icon={<Icon name={target === 'workspace-safety' ? 'shield-check' : icons[id]} />} endContent={s.page === id && !target ? <Text as="span" color="inherit" className="reference-menu-current" aria-hidden="true">✓</Text> : null}>
                    {label}
                  </B>
                ))}
                {name === 'Platform' ? <Text type="supporting" color="secondary" className="reference-menu-footer">{s.workspace.name || 'Local workspace'} · On this Mac</Text> : null}
              </nav>
            </details>
          );
        })}
      </nav>
      <B size="md" variant="ghost" className="reference-attention" data-attention-home="1" label={`Needs your attention · Attention inbox · ${unread} unread`} title="Attention inbox">
        <Text as="span" className="attention-badge" data-attention-count="">{unread}</Text>
      </B>
      <B size="md" primary className="reference-ask" data-chat-open="1">Ask GiGi</B>
    </header>
  );
}
