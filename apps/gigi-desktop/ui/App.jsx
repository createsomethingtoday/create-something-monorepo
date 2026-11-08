import React from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Dialog } from '@astryxdesign/core/Dialog';
import { B, Panel, Message, Heading, Text, VStack, HStack } from './components.jsx';
import {
  Today,
  Collection,
  RecordDetail,
  RecordEditor,
  LinkEditor,
  History,
  pageName
} from './records.jsx';
import { Settings, Onboarding, SourceProposal } from './settings.jsx';
import { Appearance } from './appearance.jsx';
import { Music, Social } from './creators.jsx';
import { Chat, WorkspaceSearch } from './chat.jsx';
import { sections } from '../web/model.mjs';

function Notices({ state }) {
  return state.toast ? (
    <aside className={`toast gigi-toast ${state.toast.error ? 'error' : ''}`}>
      <Message error={state.toast.error}>{state.toast.message}</Message>
      <B variant="ghost" data-notice-dismiss="1" label="Dismiss message">
        Dismiss
      </B>
    </aside>
  ) : null;
}

export function App({ ctx }) {
  const s = ctx.state;
  if (s.startupError)
    return (
      <Panel title="Couldn’t open GiGi">
        <Message error>{s.startupError}</Message>
        <B onClick={() => location.reload()}>Retry</B>
      </Panel>
    );
  if (!s.workspace || s.setupProfile)
    return (
      <>
        <Onboarding ctx={ctx} />
        <Notices state={s} />
      </>
    );
  let body = ctx.sourceProposal ? (
    <SourceProposal ctx={ctx} />
  ) : s.editing === 'link' ? (
    <LinkEditor ctx={ctx} />
  ) : s.editing ? (
    <RecordEditor ctx={ctx} />
  ) : s.selected ? (
    <RecordDetail ctx={ctx} />
  ) : s.page === 'overview' ? (
    <Today ctx={ctx} />
  ) : s.page === 'settings' ? (
    <Settings ctx={ctx} />
  ) : s.page === 'appearance' ? (
    <Appearance ctx={ctx} />
  ) : s.page === 'music' ? (
    <Music ctx={ctx} />
  ) : s.page === 'social' ? (
    <Social ctx={ctx} />
  ) : s.page === 'history' ? (
    <History ctx={ctx} />
  ) : (
    <Collection ctx={ctx} />
  );
  const header = (
    <header className="gigi-topbar">
      <HStack gap={3} className="gigi-header-content">
        <Heading level={2}>GiGi</Heading>
        <Text color="secondary" type="supporting">
          {s.workspace.name}
        </Text>
        <HStack gap={2} className="gigi-header-actions">
          <B
            data-workspace-history="-1"
            disabled={!ctx.workspaceHistory.target(-1)}
            label="Previous page"
            isIconOnly
            icon={<Text aria-hidden="true">‹</Text>}
          />
          <B
            data-workspace-history="1"
            disabled={!ctx.workspaceHistory.target(1)}
            label="Next page"
            isIconOnly
            icon={<Text aria-hidden="true">›</Text>}
          />
          <B data-workspace-search="1" aria-expanded={ctx.workspaceSearch.visible}>
            Search · ⌘F
          </B>
          <B data-attention-home="1">Attention {ctx.attention?.unreadCount || 0}</B>
          <B data-chat-open="1" primary>
            Ask GiGi
          </B>
        </HStack>
      </HStack>
    </header>
  );
  const nav = (
    <nav aria-label="Workspace" className="gigi-sidenav">
      <VStack gap={1}>
        {['overview', 'gigs', 'schedule', 'tasks', 'contacts', 'finances', 'music', 'social'].map(
          (page) => (
            <B
              key={page}
              data-page={page}
              variant={s.page === page ? 'primary' : 'ghost'}
              aria-current={s.page === page ? 'page' : undefined}
            >
              {pageName(page)}
            </B>
          )
        )}
        <details>
          <summary>Library</summary>
          <VStack gap={1}>
            {sections
              .filter(
                (item) =>
                  ![
                    'overview',
                    'gigs',
                    'schedule',
                    'tasks',
                    'contacts',
                    'finances',
                    'music',
                    'social',
                    'history',
                    'settings'
                  ].includes(item.id)
              )
              .map((item) => (
                <B
                  key={item.id}
                  data-page={item.id}
                  variant={s.page === item.id ? 'primary' : 'ghost'}
                >
                  {item.label}
                </B>
              ))}
          </VStack>
        </details>
        <B data-page="history" variant={s.page === 'history' ? 'primary' : 'ghost'}>
          History
        </B>
        <B data-page="appearance" variant={s.page === 'appearance' ? 'primary' : 'ghost'}>
          Appearance & views
        </B>
        <B data-page="settings" variant={s.page === 'settings' ? 'primary' : 'ghost'}>
          Setup & safety
        </B>
        <Text type="supporting" color="secondary">
          Private workspace · On this Mac
        </Text>
      </VStack>
    </nav>
  );
  return (
    <>
      <AppShell
        variant="section"
        topNav={header}
        sideNav={nav}
        contentPadding={0}
        mobileNav={{ breakpoint: 'sm' }}
      >
        <section
          className="main gigi-main"
          tabIndex={-1}
          aria-label={`GiGi / ${pageName(s.page)}`}
          aria-busy={s.busy}
        >
          <VStack
            gap={6}
            className="gigi-page"
            key={`${ctx.workspaceId}:${s.page}:${s.editing}:${s.selected?.id || ''}`}
          >
            {body}
          </VStack>
        </section>
      </AppShell>
      <Chat ctx={ctx} />
      <WorkspaceSearch ctx={ctx} />
      <Dialog
        isOpen={Boolean(ctx.pendingLeave)}
        purpose="form"
        role="alertdialog"
        aria-labelledby="leave-title"
        onOpenChange={() => ctx.actions.keepEditing()}
      >
        <VStack gap={4}>
          <Heading id="leave-title" level={2}>
            Keep your changes?
          </Heading>
          <Text>
            This record has unsaved changes. Keep editing to save them, or discard them to leave.
          </Text>
          <HStack gap={3} wrap="wrap">
            <B primary data-keep-editing="1">
              Keep editing
            </B>
            <B data-discard-changes="1">Discard changes</B>
          </HStack>
        </VStack>
      </Dialog>
      <Notices state={s} />
    </>
  );
}
