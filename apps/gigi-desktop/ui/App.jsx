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
import { Memory } from './memory.jsx';
import { DevNavigation } from './dev-navigation.jsx';

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
  if (!s.workspace || s.setupProfile || ctx.devQuest?.view.active)
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
  ) : s.page === 'memory' ? (
    <Memory ctx={ctx} />
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
  return (
    <>
      <AppShell
        variant="section"
        topNav={<DevNavigation ctx={ctx} />}
        contentPadding={0}
        mobileNav={false}
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
