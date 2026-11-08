import React from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { themes as installedThemes } from '../astryx-themes.js';
const neutralTheme = installedThemes.neutral;
import { Grid } from '@astryxdesign/core/Grid';
import { Divider } from '@astryxdesign/core/Divider';
import {
  B,
  Field,
  Choice,
  Panel,
  PageHeading,
  Message,
  Disclosure,
  Heading,
  Text,
  VStack,
  HStack,
  Card
} from './components.jsx';

const themes = [
  ['studio', 'Studio', 'Neutral surfaces and clear type.', 'dark'],
  ['paper', 'Paper', 'A light workspace for daytime work.', 'light'],
  ['midnight', 'Midnight', 'Deeper surfaces for a quieter workspace.', 'dark']
];
const preferences = [
  [
    'density',
    'Spacing',
    [
      ['comfortable', 'Comfortable'],
      ['compact', 'Compact']
    ],
    'Adjust navigation, record rows and panel spacing.'
  ],
  [
    'startPage',
    'Open GiGi to',
    [
      ['overview', 'Today'],
      ['music', 'Music'],
      ['social', 'Instagram drafts'],
      ['gigs', 'Gigs & shifts'],
      ['schedule', 'Schedule'],
      ['tasks', 'Tasks'],
      ['finances', 'Money'],
      ['contacts', 'People']
    ],
    'Your starting page the next time GiGi opens.'
  ],
  [
    'collectionView',
    'Record layout',
    [
      ['list', 'List'],
      ['cards', 'Cards']
    ],
    'Used for Gigs and record collections. Today, Music, Instagram and Schedule keep their own layouts.'
  ],
  [
    'chatWidth',
    'Chat width',
    [
      ['standard', 'Standard'],
      ['wide', 'Wide']
    ],
    'Give responses more room without changing the workspace layout.'
  ],
  [
    'chatTextSize',
    'Chat text',
    [
      ['standard', 'Standard'],
      ['larger', 'Larger']
    ],
    'Adjust response text for comfortable reading.'
  ],
  [
    'chatDensity',
    'Chat spacing',
    [
      ['comfortable', 'Comfortable'],
      ['compact', 'Compact']
    ],
    'Space between messages, separate from workspace spacing.'
  ],
  [
    'scheduleView',
    'Schedule view',
    [
      ['upcoming', 'Upcoming'],
      ['past', 'Past'],
      ['all', 'All entries']
    ],
    'Remembered when you switch views in Schedule, too.'
  ]
];

function ThemeChoice({ ctx, id, title, description, mode }) {
  const selected = ctx.preferences.theme === id;
  const theme = ctx.themeDefinitions?.[id] || neutralTheme;
  return (
    <VStack gap={3}>
      <Theme theme={theme} mode={mode}>
        <Card padding={4} variant="muted">
          <VStack gap={3} aria-hidden="true">
            <Heading level={3}>Your next gig</Heading>
            <Text color="secondary">Call time and crew details</Text>
            <Divider />
            <Text weight="medium">Ready for your review</Text>
          </VStack>
        </Card>
      </Theme>
      <B
        data-preferences-theme={id}
        aria-pressed={selected}
        primary={selected}
        label={`${title}${selected ? ' · selected' : ''}`}
      >
        {title}
        {selected ? ' ✓' : ''}
      </B>
      <Text color="secondary" type="supporting">
        {description}
      </Text>
    </VStack>
  );
}

export function Appearance({ ctx }) {
  const {
    preferences: prefs,
    preferencesDraft: draft,
    preferencesExported: exported,
    preferencesExportChat: includeChat,
    preferencesFeedback: feedback
  } = ctx;
  return (
    <VStack gap={6}>
      <PageHeading
        title="Appearance & views"
        description="Choose a workspace that feels right for your day."
        actions={<B data-page="settings">Setup & safety</B>}
      />
      <Panel id="workspace-preferences" title="Make GiGi yours">
        <Text color="secondary">On this device</Text>
        <Text>
          Choose how your work looks and where your day starts. Changes save automatically for this
          workspace on this Mac.
        </Text>
        {feedback?.message && (
          <Message
            error={Boolean(feedback.error)}
            title={feedback.error ? 'Appearance could not be saved' : 'Appearance updated'}
          >
            {feedback.message}
          </Message>
        )}
        <fieldset>
          <legend>Theme</legend>
          <Grid columns={3} gap={4}>
            {themes.map(([id, title, description, mode]) => (
              <ThemeChoice
                key={id}
                ctx={ctx}
                id={id}
                title={title}
                description={description}
                mode={mode}
              />
            ))}
          </Grid>
        </fieldset>
        <Grid columns={2} gap={5}>
          {preferences.map(([key, label, options, help]) => (
            <Choice
              key={key}
              id={`preference-${key}`}
              name={key}
              data-preference={key}
              label={label}
              value={String(prefs[key])}
              options={options}
              help={help}
            />
          ))}
        </Grid>
        <Disclosure
          title="Share or edit a configuration"
          className="portable-preferences"
          data-preferences-disclosure="1"
          data-view-key="preferences-portable"
        >
          <Text color="secondary">
            Copy your appearance and view settings to another GiGi workspace, or edit the JSON and
            import it here. Configuration contains appearance and view choices only. Records,
            accounts and permissions stay separate.
          </Text>
          <Choice
            id="preferences-export-format"
            label="Configuration to copy"
            value={includeChat ? 'chat' : 'compatible'}
            options={[
              ['compatible', 'Workspace appearance (GiGi 0.2.18 or later)'],
              ['chat', 'Workspace and chat (GiGi 0.2.22 or later)']
            ]}
            help="Workspace appearance keeps themes and saved views compatible with older GiGi. Choose Workspace and chat to include chat width, text size and spacing."
          />
          <B data-preferences-export="1">Show configuration JSON</B>
          {exported && (
            <VStack gap={3}>
              <Field
                id="preferences-export"
                label="Configuration JSON"
                textarea
                readOnly
                value={exported}
                hasSpellCheck={false}
              />
              <B data-preferences-copy="1">Copy configuration</B>
            </VStack>
          )}
          <form id="preferences-import-form">
            <VStack gap={3}>
              <Field
                id="preferences-import"
                name="configuration"
                label="Import configuration JSON"
                textarea
                value={draft || ''}
                maxLength={16384}
                hasSpellCheck={false}
                placeholder={'{"version": 1, "theme": "studio", "density": "compact"}'}
                help="Up to 16 KiB. Keep a copy of your current configuration before importing. Omitted preferences return to their defaults. Import applies after validation."
              />
              <B type="submit" id="preferences-import-submit">
                Import configuration
              </B>
            </VStack>
          </form>
        </Disclosure>
        <Divider />
        <HStack gap={4} wrap="wrap">
          <Text color="secondary">Return appearance and views to the Studio defaults.</Text>
          <B variant="ghost" id="preferences-reset" data-preferences-reset="1">
            Reset appearance & views
          </B>
        </HStack>
      </Panel>
    </VStack>
  );
}
