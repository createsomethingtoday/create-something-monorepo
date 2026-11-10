import React, { useEffect, useRef } from 'react';
import {
  B,
  Field,
  Choice,
  PageHeading,
  Message,
  Disclosure,
  Heading,
  Text,
  VStack,
  HStack
} from './components.jsx';
import { List, ListItem } from '@astryxdesign/core/List';
import { Grid, GridSpan } from '@astryxdesign/core/Grid';
import { Section } from '@astryxdesign/core/Section';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { localToday } from '../web/experience.mjs';
import { shiftDay, mondayOf } from '../web/today-view.mjs';
import { finishedTask, taskDateLabel } from '../web/calm-work.mjs';
import { statusLabel } from '../web/desktop-polish.mjs';
import { scheduleEntry } from '../web/schedule.mjs';
import { eventLabel } from '../web/event-identity.mjs';
import { formatMoney, supportedCurrencies } from '../web/model.mjs';
import { DevQuestResume } from './dev-quest.jsx';

// Page regions retain Danny's hierarchy; Astryx owns their spacing and frame.
function WorkSection({ title, actions, children, ...props }) {
  return (
    <Section variant="transparent" padding={0} {...props}>
      <VStack gap={4}>
        <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
          {title}
          {actions}
        </HStack>
        {children}
      </VStack>
    </Section>
  );
}
// ListItem owns rich, variable-height record rows. Its real button remains the
// keyboard target; the root marker bridges the controller's return-focus lookup.
function WorkRecordItem({ ctx, entity, record, disabled = false, ...props }) {
  const host = useRef(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const control = node.querySelector('button');
    control?.setAttribute('aria-label', record.title || 'Untitled record');
    node.focus = (options) => control?.focus(options);
    return () => {
      delete node.focus;
    };
  }, [record.title]);
  return (
    <ListItem
      ref={host}
      {...props}
      data-open={record.id}
      data-entity={entity}
      isDisabled={disabled}
      onClick={() => {
        if (!disabled) ctx.actions.run(() => ctx.actions.navigateRecord(entity, record.id));
      }}
    />
  );
}
const count = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : null);
const dateText = (day, options = { month: 'short', day: 'numeric' }) => {
  const value = new Date(`${day}T12:00:00`);
  return Number.isFinite(value.getTime())
    ? new Intl.DateTimeFormat('en-US', options).format(value)
    : 'Date needs attention';
};
function ReadTime({ value }) {
  if (!['string', 'number'].includes(typeof value) || value === '') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? (
    <time dateTime={date.toISOString()}>
      {new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date)}
    </time>
  ) : null;
}
function DueDate({ day, today }) {
  if (!day)
    return (
      <Text type="supporting" color="secondary">
        Date not recorded
      </Text>
    );
  const label =
    day < today
      ? 'Overdue'
      : day === today
        ? 'Today'
        : day === shiftDay(today, 1)
          ? 'Tomorrow'
          : dateText(day, { weekday: 'short' });
  return (
    <VStack gap={1} className={`dev-due${day < today ? ' is-overdue' : ''}`}>
      <Text type="supporting" color="inherit">
        {label}
      </Text>
      <Text as="time" type="supporting" color="secondary" dateTime={day}>
        {dateText(day)}
      </Text>
    </VStack>
  );
}
function Unread({ entity }) {
  return (
    <VStack gap={3} paddingBlock={6} hAlign="start" className="dev-work-empty">
      <Text color="secondary">
        This section has not been read. Read local records again, or open the collection.
      </Text>
      <B data-page={entity}>Open collection</B>
    </VStack>
  );
}
function CalendarSource({ record, day }) {
  const source = record.source?.kind === 'manual' ? record.source.origin : record.source;
  const reference = source?.provider ? source : record.identity?.sourceRef;
  if (!reference?.provider) return null;
  const provider =
    { gmail: 'Gmail', googlecalendar: 'Google Calendar' }[reference.provider] || reference.provider;
  const observed =
    ['string', 'number'].includes(typeof source?.observedAt) &&
    source.observedAt !== '' &&
    Number.isFinite(new Date(source.observedAt).getTime());
  return (
    <Disclosure
      title={provider}
      data-view-key={`today-source-${record.entity}-${record.id}-${day}`}
      className="dev-calendar-source"
    >
      <Text type="supporting">
        {observed ? (
          <>
            Source last observed <ReadTime value={source.observedAt} />.
          </>
        ) : (
          'Source observation time is not included in this Today read.'
        )}
      </Text>
      <B data-entity={record.entity || 'gigs'} data-open={record.id}>
        Open source details
      </B>
    </Disclosure>
  );
}
function WeekCalendar({ data, today, busy }) {
  const calendar = data.calendar,
    start = calendar?.weekStart || mondayOf(today),
    end = shiftDay(start, 6),
    items = calendar?.items || [];
  const known = count(calendar?.count),
    range = `${dateText(start)} – ${dateText(end)}`;
  return (
    <WorkSection
      className="dev-today-section dev-today-calendar"
      title={
        <Heading level={2} id="today-events-title">
          Upcoming Gigs
        </Heading>
      }
      actions={
        <B variant="ghost" data-page="schedule">
          View schedule
        </B>
      }
    >
      <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap" className="dev-calendar-toolbar">
        <VStack gap={1}>
          <Text weight="semibold">{dateText(start, { month: 'long', year: 'numeric' })}</Text>
          <Text type="supporting" color="secondary">
            {range}
          </Text>
        </VStack>
        <HStack gap={2} className="dev-week-controls">
          <B data-today-week="previous" aria-label="Previous week" disabled={busy}>
            ←
          </B>
          <B data-today-week="current" aria-label="Current week" disabled={busy}>
            Today
          </B>
          <B data-today-week="next" aria-label="Next week" disabled={busy}>
            →
          </B>
        </HStack>
      </HStack>
      {known === null ? (
        <Unread entity="schedule" />
      ) : (
        <ScrollableArea
          axis="both"
          width="100%"
          maxWidth="100%"
          className="dev-calendar-scroll"
          role="region"
          label={`Gig calendar · ${range}`}
        >
          <Grid
            columns={7}
            width="max(100%, 61.25rem)"
            minHeight="17.5rem"
            className="dev-week-calendar"
          >
            {Array.from({ length: 7 }, (_, index) => {
              const day = shiftDay(start, index);
              const entries = items.filter((record) => {
                const entry = scheduleEntry(record);
                return (
                  (record.date || entry.key) <= day &&
                  (record.endDate || record.date || entry.endKey) >= day
                );
              });
              return (
                <Section
                  key={day}
                  variant="transparent"
                  padding={0}
                  dividers={index < 6 ? ['end'] : undefined}
                  className={`dev-calendar-day${day === today ? ' is-today' : ''}`}
                  aria-labelledby={`calendar-day-${day}`}
                >
                  <HStack
                    padding={3}
                    hAlign="between"
                    vAlign="center"
                    gap={2}
                    className="dev-calendar-day-heading"
                  >
                    <Heading level={6} accessibilityLevel={3} id={`calendar-day-${day}`}>
                      {dateText(day, { weekday: 'short' })}
                    </Heading>
                    <HStack
                      as="time"
                      width="2rem"
                      minHeight="2rem"
                      hAlign="center"
                      vAlign="center"
                      dateTime={day}
                      aria-current={day === today ? 'date' : undefined}
                    >
                      <Text type="label">{Number(day.slice(-2))}</Text>
                    </HStack>
                  </HStack>
                  <VStack gap={2} padding={2} minHeight="9rem" className="dev-calendar-day-events">
                    {entries.map((record) => {
                      const entry = scheduleEntry(record);
                      return (
                        <Section
                          key={`${record.entity}:${record.id}`}
                          padding={0}
                          variant="transparent"
                          className="dev-calendar-entry"
                        >
                          <B
                            variant="ghost"
                            size="sm"
                            width="100%"
                            style={{ justifyContent: 'start', textAlign: 'start' }}
                            className="dev-calendar-event"
                            data-open={record.id}
                            data-entity={record.entity || 'gigs'}
                            label={record.title || 'Untitled'}
                          >
                            <VStack gap={1} hAlign="start" width="100%">
                              <Text textWrap="wrap" weight="semibold">
                                {record.title || 'Untitled'}
                              </Text>
                              <Text type="supporting">{entry.time}</Text>
                              <Text type="supporting" color="secondary">
                                {eventLabel(record, record.entity || 'gigs')}
                              </Text>
                              {record.status && (
                                <Text type="supporting" color="secondary">
                                  {statusLabel(record.status)}
                                </Text>
                              )}
                            </VStack>
                          </B>
                          <CalendarSource record={record} day={day} />
                        </Section>
                      );
                    })}
                    {!entries.length && (
                      <VStack paddingBlock={3} paddingInline={1}>
                        <Text type="supporting" color="secondary">
                          No gigs
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </Section>
              );
            })}
          </Grid>
        </ScrollableArea>
      )}
      <Text type="supporting" color="secondary">
        Gigs and saved calendar entries · Monday–Sunday
        {known !== null && known > items.length
          ? ` · Showing ${items.length} of ${known}; open Schedule for all records.`
          : ''}
      </Text>
    </WorkSection>
  );
}
function TodayTasks({ data, today }) {
  const value = data.tasks,
    total = count(value?.count),
    items = value?.items || [];
  const compact = useMediaQuery('(max-width: 38.75rem)');
  const columns = compact ? [6, 4, 2] : [7, 3, 2];
  return (
    <WorkSection
      className="dev-today-section"
      title={<Heading level={2}>Open Tasks</Heading>}
      actions={
        <B variant="ghost" data-page="tasks">
          View tasks
        </B>
      }
    >
      {total === null ? (
        <Unread entity="tasks" />
      ) : items.length ? (
        <VStack gap={0} className="dev-today-tasks" role="table" aria-label="Open tasks">
          <VStack
            paddingBlock={3}
            paddingInline={2}
            className="dev-today-task-row dev-list-columns"
            role="row"
          >
            <Grid columns={12} gap={compact ? 2 : 4} align="center" role="presentation">
              {['Task', 'Date', 'Priority'].map((label, index) => (
                <GridSpan key={label} columns={columns[index]} role="columnheader">
                  <Text type="label" color="secondary">
                    {label}
                  </Text>
                </GridSpan>
              ))}
            </Grid>
          </VStack>
          {items.map((record) => (
            <VStack
              key={record.id}
              paddingBlock={3}
              paddingInline={2}
              className="dev-today-task-row"
              role="row"
            >
              <Grid columns={12} gap={compact ? 2 : 4} align="center" role="presentation">
                <GridSpan columns={columns[0]} role="cell">
                  <B
                    variant="ghost"
                    width="100%"
                    style={{ justifyContent: 'start', textAlign: 'start' }}
                    className="dev-record-name"
                    data-open={record.id}
                    data-entity="tasks"
                  >
                    <HStack width="100%" hAlign="start">
                      <Text textWrap="wrap">{record.title || 'Untitled task'}</Text>
                    </HStack>
                  </B>
                </GridSpan>
                <GridSpan columns={columns[1]} role="cell">
                  <DueDate day={record.date} today={today} />
                </GridSpan>
                <GridSpan columns={columns[2]} role="cell">
                  <Text type="supporting">
                    {record.fields?.Priority || record.priority || 'Not set'}
                  </Text>
                </GridSpan>
              </Grid>
            </VStack>
          ))}
        </VStack>
      ) : (
        <VStack gap={3} paddingBlock={6} hAlign="start" className="dev-work-empty">
          <Text color="secondary">No open tasks overdue, today, or tomorrow.</Text>
          <B data-new="tasks">Add a task</B>
        </VStack>
      )}
      <Text type="supporting" color="secondary">
        Overdue · Today · Tomorrow
        {total !== null && total > items.length
          ? ` · Showing ${items.length} of ${total}; open Tasks for all records.`
          : ''}
      </Text>
    </WorkSection>
  );
}
function MoneyColumn({ ctx, data, name, title, today, currency }) {
  const value = data[name],
    total = count(value?.count),
    items = value?.items || [];
  return (
    <Section
      variant="transparent"
      padding={0}
      role="region"
      aria-labelledby={`today-${name}-title`}
      className="dev-money-section"
    >
      <VStack gap={3}>
        <Heading level={3} id={`today-${name}-title`}>
          {title}
        </Heading>
        {total === null ? (
          <Unread entity="finances" />
        ) : items.length ? (
          <List
            density="balanced"
            hasDividers
            edge="padded"
            aria-labelledby={`today-${name}-title`}
          >
            {items.map((record) => (
              <WorkRecordItem
                key={record.id}
                ctx={ctx}
                entity="finances"
                record={record}
                className="dev-money-row"
                label={
                  <Text weight="semibold" textWrap="wrap">
                    {record.title || 'Untitled'}
                  </Text>
                }
                description={
                  <VStack gap={2} hAlign="start">
                    <Text type="supporting" color="secondary">
                      {statusLabel(record.status) || 'Status not set'}
                    </Text>
                    <DueDate day={record.date} today={today} />
                  </VStack>
                }
                endContent={
                  <Text weight="semibold" hasTabularNumbers justify="end">
                    {Number.isSafeInteger(record.moneyCents)
                      ? `${formatMoney(record.moneyCents, currency)}${supportedCurrencies.has(currency) ? ` ${currency}` : ''}`
                      : 'Amount not recorded'}
                  </Text>
                }
              />
            ))}
          </List>
        ) : (
          <VStack paddingBlock={6}>
            <Text color="secondary">No {title.toLowerCase()} overdue or due this week.</Text>
          </VStack>
        )}
        {total !== null && total > items.length && (
          <Text type="supporting" color="secondary">
            Showing {items.length} of {total}; open Money for all records.
          </Text>
        )}
      </VStack>
    </Section>
  );
}
// Native Today reads own the full-collection date windows and counts. Changing
// the displayed calendar week never filters task or financial previews here.
export function DevToday({ ctx, attention }) {
  const s = ctx.state,
    data = s.overview || {},
    today = data.today || localToday();
  return (
    <VStack gap={6} className="dev-today-home">
      <PageHeading
        title="Today"
        description="Your gigs, calendar dates and next steps."
        actions={
          <>
            <B data-new="tasks">New task</B>
            <B primary data-new="gigs">
              New gig
            </B>
          </>
        }
      />
      <HStack gap={3} hAlign="between" wrap="wrap" className="dev-read-status">
        <Text type="supporting" color="secondary">
          {s.overviewCheckedAt ? (
            <>
              Last successful local read · <ReadTime value={s.overviewCheckedAt} />
            </>
          ) : (
            'Local records have not been checked in this view yet.'
          )}
        </Text>
        <B variant="ghost" data-today-refresh="1" disabled={s.busy}>
          Read local records again
        </B>
      </HStack>
      {s.overviewError && (
        <Message error>
          <VStack gap={2}>
            <Text weight="semibold">Could not refresh Today.</Text>
            <Text>
              {typeof s.overviewError === 'string' ? s.overviewError : s.overviewError.message}
              {s.overviewCheckedAt && s.overview ? ' Showing the last successful local read.' : ''}
            </Text>
          </VStack>
        </Message>
      )}
      <Disclosure title="About record freshness" data-view-key="today-freshness">
        <Text color="secondary">
          A local read does not sync Gmail or Calendar. Open a record for its source details. Tasks
          use Due Date, falling back to Do Date. Financials use Due Date and saved unpaid status.
        </Text>
      </Disclosure>
      <DevQuestResume ctx={ctx} />
      <WeekCalendar data={data} today={today} busy={s.busy} />
      <TodayTasks data={data} today={today} />
      <WorkSection
        className="dev-today-section"
        title={<Heading level={2}>Financials</Heading>}
        actions={
          <B variant="ghost" data-page="finances">
            View money
          </B>
        }
      >
        <Text type="supporting" color="secondary">
          Overdue or due this week
          {data.financialThrough ? ` · Through ${dateText(data.financialThrough)}` : ''}
        </Text>
        <Grid columns={{ minWidth: 280, max: 2 }} gap={6} className="dev-financial-columns">
          <MoneyColumn
            ctx={ctx}
            data={data}
            name="payable"
            title="Payable"
            today={today}
            currency={s.currency}
          />
          <MoneyColumn
            ctx={ctx}
            data={data}
            name="receivable"
            title="Receivable"
            today={today}
            currency={s.currency}
          />
        </Grid>
      </WorkSection>
      {attention}
    </VStack>
  );
}
export function DevTasks({ ctx }) {
  const s = ctx.tasks || {},
    c = s.criteria || { view: 'upcoming', query: '' },
    r = s.result,
    items = r?.items || [],
    pending = Boolean(s.loading || s.error || s.stale),
    today = r?.today || localToday();
  const compact = useMediaQuery('(max-width: 38.75rem)');
  const tabs = [
    ['upcoming', 'Due soon', 'soon'],
    ['all', 'All open', 'all'],
    ['past', 'Done', 'done']
  ];
  const resultText = s.loading
    ? 'Loading tasks…'
    : s.error
      ? 'Couldn’t refresh tasks.'
      : s.stale
        ? 'Refresh to see the latest tasks.'
        : `${r?.count || 0} ${(r?.count || 0) === 1 ? 'task' : 'tasks'}${r?.nextCursor ? ` · showing ${items.length}` : ''}`;
  return (
    <VStack gap={4} className="dev-calm-collection">
      <Grid columns={{ minWidth: 360, max: 2 }} gap={4} align="end" className="dev-work-toolbar">
        <HStack
          gap={2}
          wrap="wrap"
          vAlign="center"
          className="dev-work-tabs"
          role="group"
          aria-label="Task views"
        >
          {tabs.map(([view, label, key]) => (
            <B
              key={view}
              data-tasks-view={view}
              aria-pressed={c.view === view}
              variant={c.view === view ? 'secondary' : 'ghost'}
            >{`${label}${!pending && r?.viewCounts?.[key] !== undefined ? ` (${r.viewCounts[key]})` : ''}`}</B>
          ))}
        </HStack>
        <Field
          id="tasks-search"
          label="Search tasks"
          type="search"
          value={c.query || ''}
          placeholder="Find a task"
          maxLength={160}
          aria-controls="tasks-results"
        />
      </Grid>
      <HStack gap={3} hAlign="between" wrap="wrap" className="dev-list-meta">
        <Text role="status" aria-live="polite" type="supporting" color="secondary">
          {resultText}
        </Text>
        <B variant="ghost" data-tasks-refresh="1" disabled={s.loading}>
          Refresh
        </B>
      </HStack>
      {s.error && (
        <Message error>
          <Text>{s.error}</Text>
          <B data-tasks-refresh="1" disabled={s.loading}>
            Try again
          </B>
        </Message>
      )}
      {pending && items.length > 0 && (
        <Text color="secondary" type="supporting">
          Previous results are shown below.
        </Text>
      )}
      <VStack gap={3} id="tasks-results" aria-busy={Boolean(s.loading)}>
        {items.length ? (
          <VStack gap={0} className="dev-work-list" role="table" aria-label="Tasks">
            {!compact && (
              <VStack
                paddingBlock={3}
                paddingInline={4}
                className="dev-task-row dev-list-columns"
                role="row"
              >
                <Grid columns={12} gap={4} align="center" role="presentation">
                  {[
                    ['Task', 7],
                    ['Date', 3],
                    ['Status', 2]
                  ].map(([label, width]) => (
                    <GridSpan key={label} columns={width} role="columnheader">
                      <Text type="label" color="secondary">
                        {label}
                      </Text>
                    </GridSpan>
                  ))}
                </Grid>
              </VStack>
            )}
            {items.map((record) => {
              const done = finishedTask(record.status || record.fields?.Status),
                priority = record.priority || record.fields?.Priority,
                overdue =
                  record.date && record.date < today && record.dateSource !== 'planned' && !done;
              return (
                <VStack
                  key={record.id}
                  paddingBlock={3}
                  paddingInline={compact ? 2 : 4}
                  className={`dev-task-row${done ? ' is-finished' : ''}`}
                  role="row"
                >
                  <Grid columns={12} gap={compact ? 2 : 4} align="center" role="presentation">
                    <GridSpan columns={compact ? 'full' : 7} role="cell">
                      <HStack gap={2} vAlign="center" className="dev-task-name">
                        <B
                          variant="ghost"
                          className="dev-complete-task"
                          data-task-done={record.id}
                          aria-label={`${done ? 'Completed' : 'Complete'} ${record.title || 'task'}`}
                          disabled={done || pending || ctx.state.busy}
                        >
                          {done ? '✓' : '○'}
                        </B>
                        <B
                          variant="ghost"
                          width="100%"
                          style={{ justifyContent: 'start', textAlign: 'start' }}
                          className="dev-record-name"
                          data-open={record.id}
                          data-entity="tasks"
                          disabled={pending}
                        >
                          <VStack gap={1} hAlign="start" width="100%">
                            <Text
                              textWrap="wrap"
                              weight="semibold"
                              hasStrikethrough={done}
                              color={done ? 'secondary' : 'primary'}
                            >
                              {record.title || 'Untitled task'}
                            </Text>
                            {['high', 'urgent'].includes(String(priority || '').toLowerCase()) && (
                              <Text type="supporting" className="dev-priority">
                                {priority}
                              </Text>
                            )}
                          </VStack>
                        </B>
                      </HStack>
                    </GridSpan>
                    <GridSpan columns={compact ? 8 : 3} role="cell">
                      <Text
                        type="supporting"
                        className={overdue ? 'dev-task-date is-overdue' : 'dev-task-date'}
                      >
                        {taskDateLabel(record, today)}
                      </Text>
                    </GridSpan>
                    <GridSpan columns={compact ? 4 : 2} role="cell">
                      <Text type="supporting" className="dev-task-status">
                        {statusLabel(record.status || record.fields?.Status) || 'Not set'}
                      </Text>
                    </GridSpan>
                  </Grid>
                </VStack>
              );
            })}
          </VStack>
        ) : !pending ? (
          <VStack gap={3} paddingBlock={6} hAlign="start" className="dev-work-empty">
            <Heading level={2}>
              {c.query
                ? 'No matching tasks.'
                : c.view === 'past'
                  ? 'Completed tasks will appear here.'
                  : c.view === 'upcoming'
                    ? 'Nothing due soon.'
                    : 'No open tasks.'}
            </Heading>
            <Text color="secondary">
              {c.query
                ? 'Try another search.'
                : c.view === 'upcoming'
                  ? 'Overdue tasks and work dated today or tomorrow appear here.'
                  : 'Add a task when there’s something to do.'}
            </Text>
            {c.view === 'upcoming' && <B data-tasks-view="all">View all open tasks</B>}
          </VStack>
        ) : null}
        {r?.nextCursor && (
          <B data-tasks-more="1" disabled={pending}>
            Load more tasks
          </B>
        )}
      </VStack>
    </VStack>
  );
}
export function DevGigs({ ctx }) {
  const s = ctx.gigs || {},
    c = s.criteria || {},
    r = s.result || {},
    items = r.items || [],
    pending = Boolean(s.loading || s.error || s.stale),
    total = r.total ?? r.count ?? 0;
  const compact = useMediaQuery('(max-width: 38.75rem)');
  const selectedFilters =
    ['status', 'type'].filter((key) => Object.hasOwn(c, key)).length +
    Number(Boolean(c.from || c.to));
  const active = [
    c.query ? `Search: ${c.query}` : '',
    ...['status', 'type']
      .filter((key) => Object.hasOwn(c, key))
      .map(
        (key) => `${key === 'status' ? 'Status' : 'Type'}: ${c[key] === null ? 'Not set' : c[key]}`
      ),
    c.from ? `From ${c.from}` : '',
    c.to ? `Through ${c.to}` : '',
    c.sort === 'updated' ? 'Recently updated' : ''
  ].filter(Boolean);
  const view = (value, title, number) => (
    <B
      key={value}
      data-gigs-view={value}
      aria-pressed={c.view === value}
      variant={c.view === value ? 'secondary' : 'ghost'}
    >{`${title}${!pending && Number.isFinite(number) ? ` (${number})` : ''}`}</B>
  );
  return (
    <VStack gap={4} className="dev-calm-collection">
      <Grid columns={{ minWidth: 360, max: 2 }} gap={4} align="end" className="dev-work-toolbar">
        <HStack
          gap={2}
          wrap="wrap"
          vAlign="center"
          className="dev-work-tabs"
          role="group"
          aria-label="Gig date view"
        >
          {view('upcoming', 'Upcoming', r.viewCounts?.upcoming)}
          {view('past', 'Past', r.viewCounts?.past)}
          {view('all', 'All', r.viewCounts?.all)}
        </HStack>
        <Field
          id="gigs-search"
          label="Search gigs"
          type="search"
          value={c.query || ''}
          placeholder="Gig, person or place"
          maxLength={160}
          aria-controls="gigs-results"
        />
      </Grid>
      {active.length > 0 && (
        <HStack gap={3} wrap="wrap">
          <Text type="supporting" color="secondary">
            {active.join(' · ')}
          </Text>
          <B variant="ghost" data-gigs-reset="1">
            Clear filters
          </B>
        </HStack>
      )}
      <HStack gap={3} hAlign="between" wrap="wrap" className="dev-list-meta">
        <Text role="status" aria-live="polite" type="supporting" color="secondary">
          {s.loading
            ? 'Updating results…'
            : s.error
              ? 'Results unavailable'
              : s.stale
                ? 'Results need refresh'
                : `Showing ${items.length} of ${r.count ?? 0} matching · ${total} total`}
        </Text>
        <HStack gap={2} wrap="wrap">
          <Disclosure
            title={`More options${selectedFilters ? ` (${selectedFilters})` : ''}`}
            data-view-key="gigs-filters"
            open={Boolean(s.filtersOpen)}
            onToggle={(event) => {
              if (event.target === event.currentTarget) s.filtersOpen = event.currentTarget.open;
            }}
          >
            <Grid columns={{ minWidth: 240, max: 2 }} gap={4}>
              {['status', 'type'].map((key) => (
                <Choice
                  key={key}
                  id={`gigs-${key}`}
                  label={key === 'status' ? 'Status' : 'Type'}
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
                  ['date', c.view === 'past' ? 'Date · latest first' : 'Date · soonest first'],
                  ['updated', 'Recently updated']
                ]}
              />
            </Grid>
            <Text type="supporting" color="secondary">
              Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Today and ongoing work
              stay in Upcoming.
            </Text>
            <B data-gigs-reset="1">Reset view</B>
          </Disclosure>
          <B variant="ghost" data-gigs-refresh="1" disabled={s.loading}>
            Refresh
          </B>
        </HStack>
      </HStack>
      {(r.needsDateCount > 0 || c.view === 'needs_date') && (
        <HStack>{view('needs_date', 'Needs date', r.needsDateCount)}</HStack>
      )}
      {s.error && (
        <Message error>
          <Text>{s.error}</Text>
          <B data-gigs-refresh="1" disabled={s.loading}>
            Try again
          </B>
        </Message>
      )}
      {pending && items.length > 0 && (
        <Text color="secondary" type="supporting">
          Previous results are shown below.
        </Text>
      )}
      <VStack gap={3} id="gigs-results" aria-busy={Boolean(s.loading)}>
        {items.length ? (
          <VStack gap={0} className="dev-work-list">
            {!compact && (
              <VStack
                paddingBlock={3}
                paddingInline={4}
                className="dev-list-columns"
                aria-hidden="true"
              >
                <Grid columns={12} gap={4} align="center" className="dev-gig-columns">
                  {[
                    ['Gig', 4],
                    ['Date', 3],
                    ['Time', 2],
                    ['Location', 3]
                  ].map(([label, width]) => (
                    <GridSpan key={label} columns={width}>
                      <Text type="label" color="secondary">
                        {label}
                      </Text>
                    </GridSpan>
                  ))}
                </Grid>
              </VStack>
            )}
            <List density="balanced" hasDividers edge="padded" aria-label="Gigs">
              {items.map((record) => {
                const entry = scheduleEntry({ ...record, entity: 'gigs' }),
                  locations = Array.isArray(record.locationNames) ? record.locationNames : [],
                  place = locations.length
                    ? locations.join(' · ') +
                      (record.locationCount > locations.length
                        ? ` +${record.locationCount - locations.length}`
                        : '')
                    : 'Location not added';
                return (
                  <WorkRecordItem
                    key={record.id}
                    ctx={ctx}
                    entity="gigs"
                    record={record}
                    className="dev-gig-row"
                    disabled={pending}
                    label={
                      <Grid
                        columns={compact ? 1 : 12}
                        gap={compact ? 2 : 4}
                        align="center"
                        width="100%"
                        className="dev-gig-columns"
                      >
                        <GridSpan columns={compact ? 1 : 4}>
                          <VStack gap={1} hAlign="start">
                            <Text textWrap="wrap" weight="semibold">
                              {record.title || 'Untitled gig'}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {[statusLabel(record.status), eventLabel(record, 'gigs'), record.type]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </VStack>
                        </GridSpan>
                        <GridSpan columns={compact ? 1 : 3}>
                          <Text type="supporting" justify="start">
                            {compact && (
                              <Text type="supporting" color="secondary">
                                Date ·{' '}
                              </Text>
                            )}
                            {entry.key
                              ? dateText(entry.key, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  ...(entry.key.slice(0, 4) !== String(new Date().getFullYear())
                                    ? { year: 'numeric' }
                                    : {})
                                })
                              : 'Date not set'}
                          </Text>
                        </GridSpan>
                        <GridSpan columns={compact ? 1 : 2}>
                          <Text type="supporting" justify="start">
                            {compact && (
                              <Text type="supporting" color="secondary">
                                Time ·{' '}
                              </Text>
                            )}
                            {entry.key ? entry.time : 'Time not set'}
                          </Text>
                        </GridSpan>
                        <GridSpan columns={compact ? 1 : 3}>
                          <Text type="supporting" justify="start">
                            {compact && (
                              <Text type="supporting" color="secondary">
                                Location ·{' '}
                              </Text>
                            )}
                            {place}
                          </Text>
                        </GridSpan>
                      </Grid>
                    }
                  />
                );
              })}
            </List>
          </VStack>
        ) : !pending ? (
          <VStack gap={3} paddingBlock={6} hAlign="start" className="dev-work-empty">
            <Heading level={2}>
              {total ? 'No gigs match this view.' : 'No gigs or shifts yet.'}
            </Heading>
            <Text color="secondary">
              {total
                ? 'Change the view or filters, or reset to Upcoming.'
                : 'Keep dates, fees and the people involved together.'}
            </Text>
            <B {...(total ? { 'data-gigs-reset': '1' } : { 'data-new': 'gigs' })}>
              {total ? 'Reset view' : 'Add your first gig'}
            </B>
          </VStack>
        ) : null}
        {r.nextCursor && (
          <B data-gigs-more="1" disabled={pending}>
            Load more gigs
          </B>
        )}
      </VStack>
    </VStack>
  );
}
