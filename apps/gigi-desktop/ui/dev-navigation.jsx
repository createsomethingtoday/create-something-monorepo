import React from 'react';
import { B, HStack, VStack, Text } from './components.jsx';
import { sections } from '../web/model.mjs';
import { ICON_NODES } from '../web/lucide-icons.mjs';
import { StackItem } from '@astryxdesign/core/Stack';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { useMediaQuery } from '@astryxdesign/core/hooks';

// Keep Danny's workspace organization in the active React renderer. Native
// disclosures use installReferenceMenu's tested keyboard and dismissal contract.
const groups = [
  ['Work', [['gigs', 'Gigs'], ['music', 'Music'], ['finances', 'Money'], ['services', 'Services']]],
  ['Admin', [['tasks', 'Tasks'], ['schedule', 'Schedule'], ['documents', 'Documents'], ['notes', 'Notes'], ['tags', 'Tags']]],
  ['Network', [['contacts', 'People'], ['companies', 'Companies'], ['locations', 'Places'], ['interactions', 'Interactions']]],
  ['Platform', [['profile', 'Profile'], ['history', 'History'], ['memory', 'Memory'], ['settings', 'Safety', 'workspace-safety'], ['settings', 'Settings']]]
];
const icons = {
  memory: 'sticky-note', gigs: 'calendar-days', music: 'music', finances: 'wallet', services: 'briefcase',
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
  const narrow = useMediaQuery('(max-width: 47rem)');
  const compact = useMediaQuery('(max-width: 68rem)');
  const shortSearch = useMediaQuery('(max-width: 58rem)');
  const tiny = useMediaQuery('(max-width: 23rem)');
  const known = new Set([...sections.map(({ id }) => id), 'appearance']);
  const grouped = new Set(['overview', 'appearance', ...groups.flatMap(([, items]) => items.map(([id]) => id))]);
  const additional = sections.filter(({ id }) => !grouped.has(id)).map(({ id, label }) => [id, id === 'social' ? 'Social' : label]);
  const unread = ctx.attention?.unreadCount || 0;
  const history = <HStack gap={0} className="reference-history">
    <B size="md" variant="ghost" data-workspace-history="-1" disabled={!ctx.workspaceHistory.target(-1)} label="Previous page" title="Previous page (Command-[)" isIconOnly icon={<Text color="inherit" aria-hidden="true">‹</Text>} />
    <B size="md" variant="ghost" data-workspace-history="1" disabled={!ctx.workspaceHistory.target(1)} label="Next page" title="Next page (Command-])" isIconOnly icon={<Text color="inherit" aria-hidden="true">›</Text>} />
  </HStack>;
  const brand = <B size="md" variant="ghost" className="reference-brand" data-page="overview" label="GiGi Today"><Text color="inherit" className="gigi-nav-brand">GiGi</Text></B>;
  const search = <B size="md" variant="ghost" className="reference-find" data-workspace-search="1" label="Search workspace" aria-haspopup="dialog" aria-expanded={ctx.workspaceSearch.visible} title="Search workspace (Command-F)" isIconOnly={shortSearch} icon={<Icon name="search" />}>
    {shortSearch ? null : <HStack gap={2}><Text color="inherit">Search</Text>{!compact && <kbd>⌘F</kbd>}</HStack>}
  </B>;
  const navigation = <HStack as="nav" gap={narrow ? 0 : 1} width="100%" hAlign={narrow ? 'center' : 'end'} vAlign="center" className="reference-nav" aria-label="Workspace pages">
    <B size="md" variant="ghost" className="reference-today" data-page="overview" label="Today" aria-current={s.page === 'overview' ? 'page' : undefined} icon={<HStack as="span" width="var(--spacing-5)" height="var(--spacing-5)" hAlign="center" vAlign="center" className="reference-date" data-today-date="" aria-hidden="true"><Text type="supporting" color="inherit">{new Date().getDate()}</Text></HStack>}>Today</B>
    {groups.map(([name, items]) => {
      const entries = [...items, ...(name === 'Work' ? additional : [])].filter(([id]) => known.has(id));
      const selected = entries.some(([id]) => s.page === id);
      return <details key={name} className="reference-dropdown" name="workspace-navigation" data-nav-menu={name} data-view-key={`reference-${name.toLowerCase()}`}>
        <HStack as="summary" gap={narrow ? 1 : 2} height="var(--size-element-md)" paddingBlock={2} paddingInline={narrow ? 1 : compact ? 2 : 3} vAlign="center" data-nav-overflow={name} className={selected ? 'selected' : undefined}>
          <Text type="label" size={narrow ? 'xsm' : undefined} color="inherit">{name}</Text>{!tiny && <AstryxIcon icon="chevronDown" size="xsm" />}
        </HStack>
        <VStack as="nav" gap={1} padding={2} hAlign="stretch" isScrollable className="reference-menu reference-menu-group" aria-label={name}>
          {entries.map(([id, label, target]) => <B key={`${id}:${target || ''}`} width="100%" style={{justifyContent: 'start',textAlign: 'start'}} size="md" variant="ghost" data-page={id} data-nav-target={target} aria-current={s.page === id && !target ? 'page' : undefined} icon={<Icon name={target === 'workspace-safety' ? 'shield-check' : icons[id]} />} endContent={s.page === id && !target ? <Text color="inherit" className="reference-menu-current" aria-hidden="true">✓</Text> : null}>{label}</B>)}
          {name === 'Platform' && <VStack gap={0} paddingBlockStart={3} paddingBlockEnd={1} paddingInline={2} style={{maxWidth:'10rem'}} className="reference-menu-footer"><Text type="supporting" color="secondary">{s.workspace.name || 'Local workspace'} · On this Mac</Text></VStack>}
        </VStack>
      </details>;
    })}
  </HStack>;
  const attention = <B size="md" variant="ghost" className="reference-attention" data-attention-home="1" label={`Needs your attention · Attention inbox · ${unread} unread`} title="Attention inbox"><Badge className="attention-badge" data-attention-count="" label={String(unread)} /></B>;
  const ask = <B size="md" primary className="reference-ask" data-chat-open="1">Ask GiGi</B>;
  const frame = { paddingBlock: 2, paddingInline: compact ? 3 : 4, className: 'gigi-dev-topbar reference-header' };
  return narrow ? <VStack as="header" gap={1} {...frame}>
    <HStack gap={1} vAlign="center" width="100%">{history}{brand}{search}<StackItem size="fill" />{attention}{ask}</HStack>
    {navigation}
  </VStack> : <HStack as="header" gap={compact ? 1 : 2} vAlign="center" {...frame}>
    {history}{brand}{search}<StackItem size="fill">{navigation}</StackItem>{attention}{ask}
  </HStack>;
}
