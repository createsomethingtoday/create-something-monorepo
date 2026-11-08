import React from 'react';
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
import {
  fields,
  moneyFields,
  booleanFields,
  fieldOptions,
  formatMoney,
  gigBalance,
  relatedEndpoint,
  sourcePreview
} from '../web/model.mjs';
import {
  displayField,
  importantDetails,
  emptyCopy,
  fieldHelp,
  collectionCount,
  localToday
} from '../web/experience.mjs';
import { statusLabel } from '../web/desktop-polish.mjs';
import { scheduleAgenda, scheduleEntry } from '../web/schedule.mjs';
import { eventLabel } from '../web/event-identity.mjs';
import { historyPresentation, copyableRecordField } from '../web/record-polish.mjs';
import { canUseSource } from '../web/source-proposal.mjs';
import { ArtworkManager } from './creators.jsx';

export const entityName = (name) =>
  ({
    contacts: 'person',
    finances: 'financial record',
    companies: 'company',
    gigs: 'gig or shift',
    locations: 'place',
    schedule: 'event'
  })[name] || name.replace(/s$/, '');
export const pageName = (name) =>
  ({
    overview: 'Today',
    gigs: 'Gigs & shifts',
    contacts: 'People',
    finances: 'Money',
    locations: 'Places',
    appearance: 'Appearance & views',
    social: 'Instagram drafts'
  })[name] || name.charAt(0).toUpperCase() + name.slice(1);
const status = (record) => statusLabel(record?.fields?.Status || record?.status || '');

function Rows({ ctx, entity, items = [], disabled = false, showFinancialDirection = false }) {
  if (!items.length) {
    const copy = emptyCopy(entity);
    return (
      <VStack gap={3} className="gigi-empty">
        <Heading level={3}>{copy.title}</Heading>
        <Text color="secondary">{copy.description}</Text>
        <B data-new={entity}>{copy.action}</B>
      </VStack>
    );
  }
  const metadata = (record) => {
    const actualEntity = record.entity || entity;
    const event = ['gigs', 'schedule'].includes(entity)
      ? scheduleEntry({ ...record, entity: actualEntity })
      : null;
    // Event time/range/all-day meaning has its own label, so use the local
    // calendar date here rather than repeating a timestamp's time twice.
    const date = event?.key || record.date;
    return (
      [
        event ? eventLabel(record, actualEntity) : '',
        status(record),
        date ? displayField('Date', date) : '',
        event?.time,
        actualEntity === 'gigs' ? record.type : '',
        showFinancialDirection ? record.fields?.Direction || 'Direction not set' : '',
        entity === 'finances' ? formatMoney(record.moneyCents, ctx.state.currency) : ''
      ]
        .filter(Boolean)
        .join(' · ') || 'Open record'
    );
  };
  return (
    <VStack
      gap={0}
      className={`gigi-records ${ctx.preferences.collectionView === 'cards' ? 'gigi-card-collection' : ''}`}
    >
      {items.map((record) => (
        <B
          key={record.id}
          label={record.title || 'Untitled'}
          variant="ghost"
          className="gigi-record-row"
          aria-describedby={`gigi-record-${entity}-${record.id}-meta`}
          data-open={record.id}
          data-entity={record.entity || entity}
          disabled={disabled}
        >
          <HStack gap={4} className="gigi-row-content">
            <VStack gap={1}>
              <Text weight="semibold">{record.title || 'Untitled'}</Text>
              <Text
                id={`gigi-record-${entity}-${record.id}-meta`}
                type="supporting"
                color="secondary"
              >
                {metadata(record)}
              </Text>
            </VStack>
            <Text aria-hidden="true">↗</Text>
          </HStack>
        </B>
      ))}
    </VStack>
  );
}
export function Attention({ ctx }) {
  const a = ctx.attention;
  if (!a) return null;
  const labels = {
    task_due: 'Task reminder',
    gig_upcoming: 'Upcoming gig',
    approval: 'Review needed',
    session_approval: 'Review needed',
    recovery: 'Outcome needs checking',
    verified: 'Result checked'
  };
  return (
    <Panel
      id="attention-feed"
      title={
        <Heading level={2} id="attention-title" tabIndex={-1}>
          Needs your attention
        </Heading>
      }
      actions={
        <B variant="ghost" data-attention-refresh="1" disabled={a.loading}>
          {a.loading ? 'Checking…' : 'Check again'}
        </B>
      }
    >
      {a.error && <Message error>{a.error}</Message>}
      {a.observationError && <Message>{a.observationError}</Message>}
      {a.deliveryError && <Message>{a.deliveryError}</Message>}
      {(a.items || []).map((item) => (
        <HStack key={item.id} gap={4} className="gigi-attention-row">
          <VStack gap={2}>
            <Text type="supporting" color="secondary">
              {labels[item.kind] || 'Workspace update'}
              {item.unread ? ' · Unread' : ''}
            </Text>
            <Heading level={3}>{item.title}</Heading>
            <Text color="secondary">{item.body}</Text>
            <Text type="supporting" color="secondary">
              {item.entity || (item.sessionId ? 'Conversation' : 'Private workspace')}
            </Text>
          </VStack>
          <HStack gap={2} className="gigi-wrap">
            <B data-attention-open={item.id} disabled={a.pending}>
              {item.sessionId ? 'Review conversation' : 'Review record'}
            </B>
            {item.recordId && (
              <B data-attention-ask={item.id} variant="ghost" disabled={a.pending}>
                Ask GiGi
              </B>
            )}
            <Disclosure title="More">
              <B
                data-attention-update={item.id}
                data-attention-action="snooze"
                disabled={a.pending}
              >
                Snooze 1 hour
              </B>
              <B
                data-attention-update={item.id}
                data-attention-action="dismiss"
                disabled={a.pending}
              >
                Dismiss
              </B>
            </Disclosure>
          </HStack>
        </HStack>
      ))}
      {!a.items?.length && (
        <Text role="status">
          {a.loading
            ? 'Checking your workspace…'
            : a.error
              ? 'Your attention items could not be checked. Choose Check again to retry.'
              : 'You’re caught up. Dated tasks, upcoming gigs and conversation decisions will appear here.'}
        </Text>
      )}
      <Text type="supporting" color="secondary">
        Based on your saved local records. GiGi asks before changing your work.
      </Text>
    </Panel>
  );
}
export function Today({ ctx }) {
  const data = ctx.state.overview || {};
  const groups = [
    ['events' in data ? 'events' : 'gigs', 'Coming up'],
    ['tasks', 'Open tasks'],
    ['finances', 'Unpaid income & expenses']
  ];
  return (
    <VStack gap={6}>
      <PageHeading
        title="Today"
        description="Your upcoming work and open commitments."
        actions={
          <>
            <B data-new="tasks">New task</B>
            <B primary data-new="gigs">
              New gig
            </B>
          </>
        }
      />
      <HStack gap={4} className="gigi-wrap">
        {groups.map(([key, title]) => (
          <B key={key} variant="ghost" data-page={key === 'events' ? 'schedule' : key}>
            <Text>
              {data[key]?.count || 0} · {title}
            </Text>
          </B>
        ))}
      </HStack>
      <Attention ctx={ctx} />
      <VStack gap={6}>
        {groups.map(([key, title]) => {
          const value = data[key] || { items: [], count: 0 };
          const entity = key === 'events' ? 'schedule' : key;
          return (
            <section key={key}>
              <VStack gap={3}>
                <HStack gap={4} className="gigi-section-head">
                  <Heading level={2}>{title}</Heading>
                  <B variant="ghost" data-page={entity}>
                    View all
                  </B>
                </HStack>
                {value.items?.length ? (
                  <Rows
                    ctx={ctx}
                    entity={entity}
                    items={value.items}
                    showFinancialDirection={entity === 'finances'}
                  />
                ) : (
                  <Text color="secondary">
                    {key === 'tasks'
                      ? 'No open tasks. Add a task when there is something to follow up.'
                      : key === 'finances'
                        ? 'No expected, invoiced or overdue payments. This is not a net balance.'
                        : 'No ongoing or upcoming events. Add a gig or import Calendar entries.'}
                  </Text>
                )}
                <Text type="supporting" color="secondary">
                  Showing {value.items?.length || 0} of {value.count || 0} matching records
                  {value.undatedCount ? ` · ${value.undatedCount} need a usable date` : ''}
                </Text>
              </VStack>
            </section>
          );
        })}
      </VStack>
      <Disclosure title="Workspace totals">
        <HStack gap={4} className="gigi-wrap">
          {Object.entries(data.counts || {}).map(([key, count]) => (
            <Text key={key}>
              {pageName(key)} · {count}
            </Text>
          ))}
        </HStack>
      </Disclosure>
      <Disclosure title="Connections and getting started">
        <Text>Work directly in GiGi. Connect sources and an agent when useful.</Text>
        <B data-page="settings">Open setup guide</B>
      </Disclosure>
    </VStack>
  );
}
function Gigs({ ctx }) {
  const s = ctx.gigs || {},
    c = s.criteria || {},
    r = s.result || {};
  const pending = s.loading || s.error || s.stale;
  return (
    <VStack gap={4}>
      <Field
        id="gigs-search"
        label="Search gigs"
        value={c.query || ''}
        type="search"
        placeholder="Title, linked person or place"
        maxLength={160}
      />
      <HStack gap={2} className="gigi-wrap">
        {['upcoming', 'past', 'all', 'needs_date'].map((view) => (
          <B key={view} data-gigs-view={view} variant={c.view === view ? 'primary' : 'secondary'}>
            {{ needs_date: 'Needs a date', upcoming: 'Upcoming', past: 'Past', all: 'All' }[view]}
            {!pending && r.viewCounts?.[view] !== undefined ? ` (${r.viewCounts[view]})` : ''}
          </B>
        ))}
      </HStack>
      <Disclosure
        title="Filters"
        open={Boolean(s.filtersOpen)}
        onToggle={(event) => {
          if (event.target === event.currentTarget) s.filtersOpen = event.currentTarget.open;
        }}
      >
        <VStack gap={4} className="gigi-form-grid">
          {['status', 'type'].map((key) => (
            <Choice
              key={key}
              id={`gigs-${key}`}
              label={pageName(key)}
              value={Object.hasOwn(c, key) ? JSON.stringify(c[key]) : ''}
              data-gigs-field={key}
              options={[
                ['', `Any ${key}`],
                ['null', 'Not set'],
                ...[
                  ...new Set([
                    ...(r[key === 'status' ? 'statusOptions' : 'typeOptions'] || []),
                    ...(typeof c[key] === 'string' ? [c[key]] : [])
                  ])
                ].map((v) => [JSON.stringify(v), v])
              ]}
            />
          ))}
          {['from', 'to'].map((key) => (
            <Field
              key={key}
              id={`gigs-${key}`}
              label={key === 'from' ? 'From date' : 'Through date'}
              value={c[key] || ''}
              type="date"
              onChange={(value) => ctx.actions.updateGigs?.({ [key]: value })}
            />
          ))}
          <Choice
            id="gigs-sort"
            label="Sort"
            value={c.sort || 'date'}
            data-gigs-field="sort"
            options={[
              ['date', 'Date'],
              ['updated', 'Recently updated']
            ]}
          />
        </VStack>
        <B data-gigs-reset="1">Reset view</B>
      </Disclosure>
      <Text role="status">
        {s.loading
          ? 'Updating results…'
          : s.error
            ? 'Results unavailable'
            : s.stale
              ? 'Results need refresh'
              : `Showing ${r.items?.length || 0} of ${r.count || 0} matching · ${r.total ?? r.count ?? 0} total`}
      </Text>
      {s.error && <Message error>{s.error}</Message>}
      {s.error || s.stale ? (
        <B data-gigs-refresh="1" disabled={s.loading}>
          Refresh results
        </B>
      ) : null}
      <Rows ctx={ctx} entity="gigs" items={r.items || []} disabled={Boolean(pending)} />
      {r.nextCursor && (
        <B data-gigs-more="1" disabled={Boolean(pending)}>
          Load more gigs
        </B>
      )}
    </VStack>
  );
}
function Schedule({ ctx }) {
  const agenda = scheduleAgenda(ctx.state.records, ctx.state.scheduleView);
  return (
    <VStack gap={4}>
      <HStack gap={2} className="gigi-wrap">
        {['upcoming', 'past', 'all'].map((view) => (
          <B
            key={view}
            data-schedule-view={view}
            variant={ctx.state.scheduleView === view ? 'primary' : 'secondary'}
          >
            {pageName(view)} ({agenda.counts[view]})
          </B>
        ))}
        <B data-schedule-today="1">Today</B>
      </HStack>
      <Text type="supporting" color="secondary">
        Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </Text>
      {agenda.undated > 0 && (
        <Message>{agenda.undated} entries need a usable date. Find them in All entries.</Message>
      )}
      {agenda.groups.map((group) => (
        <section key={group.key} id={group.key === localToday() ? 'schedule-today' : undefined}>
          <VStack gap={3}>
            <Heading level={2}>{group.title}</Heading>
            {group.entries.map((entry) => (
              <B
                key={entry.record.id}
                variant="ghost"
                className="gigi-record-row"
                data-open={entry.record.id}
                data-entity={entry.record.entity || 'schedule'}
                label={entry.record.title || 'Untitled event'}
              >
                <VStack gap={1}>
                  <Text>{entry.record.title || 'Untitled event'}</Text>
                  <Text color="secondary" type="supporting">
                    {entry.time} · {eventLabel(entry.record)} · {entry.record.status}
                  </Text>
                </VStack>
              </B>
            ))}
          </VStack>
        </section>
      ))}
      {!agenda.groups.length && <Rows ctx={ctx} entity="schedule" />}
    </VStack>
  );
}
export function Collection({ ctx }) {
  const s = ctx.state,
    name = s.page;
  return (
    <VStack gap={6}>
      <PageHeading
        title={pageName(name)}
        description={
          name === 'contacts'
            ? 'Find the people connected to your work.'
            : name === 'finances'
              ? 'Income and expenses are shown on each record; unknown balances remain incomplete.'
              : `Your private ${pageName(name).toLowerCase()} records.`
        }
        actions={
          name === 'profile' && s.records.length ? (
            <B primary data-open={s.records[0].id} data-entity="profile">
              Open profile
            </B>
          ) : (
            <B primary data-new={name}>
              Add {entityName(name)}
            </B>
          )
        }
      />
      {name === 'gigs' ? (
        <Gigs ctx={ctx} />
      ) : name === 'schedule' ? (
        <Schedule ctx={ctx} />
      ) : (
        <VStack gap={4}>
          {name === 'contacts' && (
            <>
              <Field
                label="Search people"
                id="contact-search"
                value={s.contactQuery}
                type="search"
                placeholder="Name, email, phone or company"
                maxLength={160}
              />
              <B data-clear-contacts="1" disabled={!s.contactQuery}>
                Clear search
              </B>
            </>
          )}
          <HStack gap={4} className="gigi-section-head">
            <Heading level={2}>{collectionCount(name, s.recordCount)}</Heading>
            <Text role="status" type="supporting">
              {s.contactSearching
                ? 'Searching…'
                : `Showing ${s.records.length} of ${s.recordCount}`}
            </Text>
          </HStack>
          {s.contactSearchError ? (
            <>
              <Message error>
                Couldn’t search people. Your contacts are unchanged. Retry or clear the search.
              </Message>
              <B data-retry-contacts="1">Retry search</B>
            </>
          ) : s.contactSearching ? (
            <Text role="status">Searching people…</Text>
          ) : s.contactQuery && name === 'contacts' && !s.records.length ? (
            <Text>No people match your search.</Text>
          ) : (
            <Rows ctx={ctx} entity={name} items={s.records} />
          )}{' '}
          {s.nextCursor && !s.contactSearching && !s.contactSearchError && (
            <B data-more="1">Load more</B>
          )}
        </VStack>
      )}
    </VStack>
  );
}
export function RecordEditor({ ctx }) {
  const s = ctx.state,
    record = s.selected || {},
    values = record.fields || {};
  return (
    <VStack gap={5}>
      <B variant="ghost" data-cancel="1">
        Back
      </B>
      <PageHeading
        title={`${record.id ? 'Edit' : 'Add'} ${entityName(s.page)}`}
        description={
          s.page === 'profile'
            ? 'Currency cannot change after monetary records are saved.'
            : 'Save the details you know. Leave uncertain fields empty.'
        }
      />
      <form id="record-form" data-entity={s.page} data-editor-version={String(ctx.routeVersion)}>
        <VStack gap={5}>
          <Field
            key={`${ctx.routeVersion}:title`}
            id="title"
            name="title"
            label={s.page === 'contacts' ? 'Name' : 'Title'}
            value={s.editorDraft?.title ?? record.title ?? ''}
            required
            maxLength={200}
          />
          <VStack gap={4} className="gigi-form-grid">
            {(fields[s.page] || []).map((field) => {
              const raw = values[field] ?? '',
                value =
                  s.editorDraft?.[field] ??
                  (moneyFields.has(field) && raw !== '' ? Number(raw) / 100 : raw),
                id = `field-${field.replace(/\s+/g, '-').toLowerCase()}`,
                help = fieldHelp(field, s.currency),
                opts =
                  fieldOptions(s.page, field) ||
                  (s.page === 'profile' && field === 'Currency'
                    ? ['USD', 'CAD', 'EUR', 'GBP']
                    : null);
              return opts ? (
                <Choice
                  key={field}
                  id={id}
                  name={field}
                  label={field}
                  value={String(s.editorDraft?.[field] ?? raw)}
                  help={help}
                  required={field !== 'Work kind'}
                  options={[
                    ['', field === 'Work kind' ? 'Unclassified' : `Choose ${field.toLowerCase()}`],
                    ...opts.map((v) => [v, v])
                  ]}
                />
              ) : booleanFields.has(`${s.page}.${field}`) ? (
                <Choice
                  key={field}
                  id={id}
                  name={field}
                  label={field}
                  value={String(s.editorDraft?.[field] ?? raw)}
                  options={[
                    ['', 'Not set'],
                    ['true', 'Yes'],
                    ['false', 'No']
                  ]}
                />
              ) : (
                <Field
                  key={field}
                  id={id}
                  name={field}
                  label={field}
                  value={String(value)}
                  help={help}
                  textarea={[
                    'Description',
                    'Details',
                    'Note Details',
                    'Requirements',
                    'Venue Intel',
                    'Summary'
                  ].includes(field)}
                  type={moneyFields.has(field) ? 'number' : 'text'}
                />
              );
            })}
          </VStack>
          <HStack gap={3}>
            <B data-cancel="1" disabled={s.busy}>
              Cancel
            </B>
            <B type="submit" primary disabled={s.busy}>
              {s.busy ? 'Saving…' : `Save ${entityName(s.page)}`}
            </B>
          </HStack>
        </VStack>
      </form>
    </VStack>
  );
}
export function RecordDetail({ ctx }) {
  const s = ctx.state,
    r = s.selected,
    detail = importantDetails(s.page, r.fields || {}),
    links = (r.relations || []).map((link) => relatedEndpoint(link, s.page, r.id)).filter(Boolean);
  const rows = (items) => (
    <dl className="gigi-details">
      {items.map(([key, value]) => (
        <React.Fragment key={key}>
          <dt>
            {key === 'Do Date' ? 'Planned date' : key === 'Venue Intel' ? 'Venue notes' : key}
          </dt>
          <dd>
            {s.page === 'schedule' && key === 'Date'
              ? (() => {
                  const entry = scheduleEntry(r);
                  return entry.key
                    ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(`${entry.key}T12:00:00`))} · ${entry.time} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
                    : displayField(key, value, s.currency);
                })()
              : displayField(key, value, s.currency)}
            {copyableRecordField(key, value) && (
              <B variant="ghost" data-copy-record-value={value} label={`Copy ${key}`}>
                Copy
              </B>
            )}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
  return (
    <VStack gap={5}>
      <B variant="ghost" data-back="1">
        {pageName(s.page)}
      </B>
      <PageHeading
        title={r.title || 'Untitled'}
        description={`Saved in your private ${pageName(s.page).toLowerCase()} records.`}
        actions={
          <>
            <B data-chat-open="1">Ask GiGi</B>
            <B primary data-edit="1">
              Edit details
            </B>
          </>
        }
      />
      {s.page === 'gigs' && (
        <Panel title="Balance due">
          <Heading level={2}>
            {s.summaryUnavailable ? 'Unavailable' : gigBalance(s.summary)}
          </Heading>
          {(!s.summary?.financialsComplete || s.summaryUnavailable) && (
            <Text color="secondary">
              {s.summaryUnavailable
                ? 'Financial summary unavailable. Reopen the record to check again.'
                : 'Financial details incomplete'}
            </Text>
          )}
        </Panel>
      )}
      {['gigs', 'schedule'].includes(s.page) && (
        <ArtworkManager
          ctx={ctx}
          entity={s.page}
          item={r}
          onChanged={() => ctx.actions.selectRecord(r.id, s.page)}
        />
      )}
      {r.truncatedFields?.length > 0 && (
        <Message>
          Some details are shortened. <B data-full="1">Show full details</B>
        </Message>
      )}
      <section>
        <VStack gap={4}>
          <Heading level={2}>Details</Heading>
          <Text type="supporting" color="secondary">
            {status(r) || 'Saved'}
          </Text>
          {detail.primary.length ? (
            rows(detail.primary)
          ) : (
            <Text color="secondary">No key details added yet.</Text>
          )}
          {detail.supporting.length > 0 && (
            <Disclosure title={`More details (${detail.supporting.length})`}>
              {rows(detail.supporting)}
            </Disclosure>
          )}
        </VStack>
      </section>
      <section>
        <VStack gap={3}>
          <Heading level={2} id="linked-work-heading" tabIndex={-1}>
            Linked work
          </Heading>
          {links.map((link) => (
            <B
              key={`${link.entity}:${link.id}:${link.role}`}
              variant="ghost"
              data-related-entity={link.entity}
              data-related-id={link.id}
            >{`${link.title || pageName(link.entity)} · ${link.role || pageName(link.entity)}`}</B>
          ))}
          {!links.length && (
            <Text color="secondary">Connect this record to a person, gig or place.</Text>
          )}
          {r.relationsTruncated && (
            <>
              <Text>
                {links.length} of {r.relationCount} links shown.
                {r.relationsError ? ' Could not load more; saved links are unchanged.' : ''}
              </Text>
              <B data-relations-more="1" disabled={r.relationsLoading}>
                {r.relationsLoading
                  ? 'Loading links…'
                  : r.relationsError
                    ? 'Retry loading links'
                    : 'Load more links'}
              </B>
            </>
          )}
          <B data-link="1">Link a record</B>
        </VStack>
      </section>
      {canUseSource(s.page, r) && (
        <Panel title="Use this source">
          <Text>Review a local task or gig linked to this imported record.</Text>
          <HStack gap={2}>
            <B data-source-propose="tasks">Create task from source</B>
            <B data-source-propose="gigs">Create gig from source</B>
          </HStack>
        </Panel>
      )}
      {r.source?.kind && r.source.kind !== 'manual' && (
        <Panel title="Source">
          <Text>
            {r.source.provider === 'gmail'
              ? 'Gmail'
              : r.source.provider === 'googlecalendar'
                ? 'Google Calendar'
                : 'Connected source'}
          </Text>
          <Text color="secondary">
            Imported source text is context to review, not instructions or a verified current fact.
          </Text>
          {s.sourceExpanded ? (
            <dl className="gigi-details">
              {sourcePreview(r.source).map((item) => (
                <React.Fragment key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          ) : (
            <B data-source-detail="1">View source preview</B>
          )}
        </Panel>
      )}
    </VStack>
  );
}
export function LinkEditor({ ctx }) {
  const s = ctx.state,
    candidates = [
      ...new Set((s.relationSchema?.relationFields || []).map((f) => f.targetEntity))
    ].filter((name) => name !== s.page || s.page === 'tasks'),
    selected = s.linkChoices?.entity || candidates[0],
    roles = (s.relationSchema?.relationFields || []).filter((f) => f.targetEntity === selected);
  return (
    <VStack gap={5}>
      <B data-link-cancel="1">Record</B>
      <PageHeading
        title="Link this record"
        description="Choose an existing record in your private workspace."
      />
      {candidates.length ? (
        <form id="link-form" noValidate>
          <VStack gap={4}>
            <Choice
              id="link-entity"
              name="entity"
              label="Record type"
              value={selected}
              options={candidates.map((v) => [v, pageName(v)])}
            />
            <Choice
              key={`role-${selected}`}
              id="link-role"
              name="role"
              label="Relationship"
              value={roles[0]?.name || ''}
              required
              options={roles.map((f) => [f.name, f.name])}
            />
            <Choice
              key={`record-${selected}`}
              id="link-record"
              name="id"
              label="Record"
              required
              options={[
                ['', 'Choose a record'],
                ...(s.linkChoices?.items || []).map((r) => [r.id, r.title])
              ]}
            />
            {s.linkChoices?.nextCursor && <B data-link-more="1">Load more records</B>}
            <B primary data-link-submit="1" disabled={s.busy}>
              Link records
            </B>
          </VStack>
        </form>
      ) : (
        <Text>No available relationship types for this record.</Text>
      )}
    </VStack>
  );
}
export function History({ ctx }) {
  return (
    <VStack gap={5}>
      <PageHeading title="History" description="Recent changes in this private workspace." />
      {ctx.state.history.length ? (
        ctx.state.history.map((item, index) => {
          const receipt = historyPresentation(item);
          return (
            <B
              key={item.id || index}
              variant="ghost"
              className="gigi-record-row"
              data-open={fields[item.entity] && item.recordId ? item.recordId : undefined}
              data-entity={item.entity}
              label={receipt.action}
            >
              <VStack gap={1}>
                <Text weight="semibold">{receipt.action}</Text>
                <Text>{receipt.detail || pageName(item.entity || 'workspace')}</Text>
                <Text type="supporting" color="secondary">
                  {receipt.time}
                </Text>
              </VStack>
            </B>
          );
        })
      ) : (
        <Text>No activity yet. Changes to your workspace will appear here.</Text>
      )}
    </VStack>
  );
}
