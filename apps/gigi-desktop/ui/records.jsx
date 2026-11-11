import { Directory, Services, Profile, Places } from './collection-details.jsx';
import { Conversations } from './conversations.jsx';
import React from "react";
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
  Card,
} from "./components.jsx";
import {
  fields,
  moneyFields,
  booleanFields,
  fieldOptions,
  formatMoney,
  gigBalance,
  relatedEndpoint,
  sourcePreview,
} from "../web/model.mjs";
import {
  displayField,
  importantDetails,
  emptyCopy,
  fieldHelp,
  collectionCount,
  localToday,
} from "../web/experience.mjs";
import { statusLabel } from "../web/desktop-polish.mjs";
import { scheduleAgenda, scheduleEntry } from "../web/schedule.mjs";
import { eventLabel } from "../web/event-identity.mjs";
import {
  historyPresentation,
  copyableRecordField,
} from "../web/record-polish.mjs";
import { canUseSource } from "../web/source-proposal.mjs";
import { ArtworkManager } from "./creators.jsx";
import { DevToday, DevTasks, DevGigs, WeekCalendar } from "./dev-work.jsx";
import { finishedTask } from "../web/calm-work.mjs";

export const entityName = (name) =>
  ({
    contacts: "person",
    finances: "financial record",
    companies: "company",
    gigs: "gig",
    locations: "place",
    schedule: "event",
  })[name] || name.replace(/s$/, "");
export const pageName = (name) =>
  ({
    overview: "Today",
    gigs: "Gigs",
    contacts: "People",
    finances: "Money",
    locations: "Places",
    appearance: "Appearance & views",
    social: "Social",
    attention: "Needs your attention",
  })[name] || name.charAt(0).toUpperCase() + name.slice(1);
const status = (record) =>
  statusLabel(record?.fields?.Status || record?.status || "");

function Rows({
  ctx,
  entity,
  items = [],
  disabled = false,
  showFinancialDirection = false,
}) {
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
    const event = ["gigs", "schedule"].includes(entity)
      ? scheduleEntry({ ...record, entity: actualEntity })
      : null;
    // Event time/range/all-day meaning has its own label, so use the local
    // calendar date here rather than repeating a timestamp's time twice.
    const date = event?.key || record.date;
    return (
      [
        event ? eventLabel(record, actualEntity) : "",
        status(record),
        date ? displayField("Date", date) : "",
        event?.time,
        actualEntity === "gigs" ? record.type : "",
        showFinancialDirection ? record.fields?.Direction || "Direction not set" : "",
        showFinancialDirection ? record.fields?.['Due Date'] ? `Due ${displayField('Due Date',record.fields['Due Date'])}` : 'Due date not recorded' : '',
        entity === "finances"
          ? formatMoney(record.moneyCents, ctx.state.currency)
          : "",
      ]
        .filter(Boolean)
        .join(" · ") || "Open record"
    );
  };
  return (
    <VStack
      gap={0}
      className={`gigi-records ${!["notes","documents","tags"].includes(entity) && ctx.preferences.collectionView === "cards" ? "gigi-card-collection" : ""}`}
    >
      {items.map((record) => (
        <B
          key={record.id}
          label={record.title || "Untitled"}
          variant="ghost"
          className="gigi-record-row"
          aria-describedby={`gigi-record-${entity}-${record.id}-meta`}
          data-open={record.id}
          data-entity={record.entity || entity}
          disabled={disabled}
        >
          <HStack gap={4} className="gigi-row-content">
            <VStack gap={1}>
              <Text weight="semibold">{record.title || "Untitled"}</Text>
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
    task_due: "Task reminder",
    gig_upcoming: "Upcoming gig",
    approval: "Review needed",
    session_approval: "Review needed",
    recovery: "Outcome needs checking",
    verified: "Result checked",
  };
  return (
    <Panel
      id="attention-feed"
      title={
        <Heading level={1} id="attention-title" tabIndex={-1}>
          Needs your attention
        </Heading>
      }
      actions={
        <B variant="ghost" data-attention-refresh="1" disabled={a.loading}>
          {a.loading ? "Checking…" : "Check again"}
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
              {labels[item.kind] || "Workspace update"}
              {item.unread ? " · Unread" : ""}
            </Text>
            <Heading level={3}>{item.title}</Heading>
            <Text color="secondary">{item.body}</Text>
            <Text type="supporting" color="secondary">
              {item.entity ||
                (item.sessionId ? "Conversation" : "Private workspace")}
            </Text>
          </VStack>
          <HStack gap={2} className="gigi-wrap">
            <B data-attention-open={item.id} disabled={a.pending}>
              {item.sessionId ? "Review conversation" : "Review record"}
            </B>
            {item.recordId && (
              <B
                data-attention-ask={item.id}
                variant="ghost"
                disabled={a.pending}
              >
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
            ? "Checking your workspace…"
            : a.error
              ? "Your attention items could not be checked. Choose Check again to retry."
              : "You’re caught up. Dated tasks, upcoming gigs and conversation decisions will appear here."}
        </Text>
      )}
      <Text type="supporting" color="secondary">
        Based on your saved local records. GiGi asks before changing your work.
      </Text>
    </Panel>
  );
}
export function Today({ ctx }) {
  return <DevToday ctx={ctx} />;
}
function Schedule({ ctx }) {
  const agenda = scheduleAgenda(ctx.state.records, ctx.state.scheduleView);
  return (
    <VStack gap={4}>
      <HStack gap={2} className="gigi-wrap">
        {["upcoming", "past", "all"].map((view) => (
          <B
            key={view}
            data-schedule-view={view}
            variant={ctx.state.scheduleView === view ? "primary" : "secondary"}
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
        <Message>
          {agenda.undated} entries need a usable date. Find them in All entries.
        </Message>
      )}
      {agenda.groups.map((group) => (
        <section
          key={group.key}
          id={group.key === localToday() ? "schedule-today" : undefined}
        >
          <VStack gap={3}>
            <Heading level={2}>{group.title}</Heading>
            {group.entries.map((entry) => (
              <B
                key={entry.record.id}
                variant="ghost"
                className="gigi-record-row"
                data-open={entry.record.id}
                data-entity={entry.record.entity || "schedule"}
                label={entry.record.title || "Untitled event"}
              >
                <VStack gap={1}>
                  <Text>{entry.record.title || "Untitled event"}</Text>
                  <Text color="secondary" type="supporting">
                    {entry.time} · {eventLabel(entry.record)} ·{" "}
                    {entry.record.status}
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
    <VStack
      gap={6}
      className={["tasks", "gigs"].includes(name) ? "dev-calm-page" : undefined}
    >
      <PageHeading
        title={pageName(name)}
        description={
          name === "tasks"
            ? "Your next few days."
            : name === "gigs"
              ? "When and where you’re working."
              : name === "contacts"
                ? "Find the people connected to your work."
                : name === "finances"
                  ? "Income, expenses and what is still outstanding."
                  : `Your private ${pageName(name).toLowerCase()} records.`
        }
        actions={
          name === "profile" && s.records.length ? (
            <B primary data-open={s.records[0].id} data-entity="profile">
              Open profile
            </B>
          ) : (
            <B primary data-new={name}>
              {["tasks", "gigs"].includes(name) ? "New" : "Add"}{" "}
              {entityName(name)}
            </B>
          )
        }
      />
      {name === "gigs" ? (
        <>
          {s.overviewError && <Message error>{s.overviewError} {s.overviewCheckedAt ? "Showing the previous calendar read." : "Calendar unavailable."}</Message>}
          <WeekCalendar data={s.overview || {}} today={s.overview?.today || localToday()} busy={s.busy} />
          <DevGigs ctx={ctx} />
        </>
      ) : name === "tasks" ? (
        <DevTasks ctx={ctx} />
      ) : name === "schedule" ? (
        <Schedule ctx={ctx} />
      ) : (
        <VStack gap={4}>
          {name === 'finances' && <HStack gap={2} wrap="wrap" aria-label="Money views">{['overall','payable','receivable','overdue'].map(view=><B key={view} disabled={s.busy} data-finance-view={view} aria-pressed={s.financeView===view} variant={s.financeView===view?'secondary':'ghost'}>{view[0].toUpperCase()+view.slice(1)}{s.financeCounts[view]!=null?` (${s.financeCounts[view]})`:''}</B>)}</HStack>}
          {name === "contacts" && (
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
                ? "Searching…"
                : `Showing ${s.records.length} of ${s.recordCount}`}
            </Text>
          </HStack>
          {name==='finances'&&s.financeError&&<Message error>Could not load this money view. {s.financeError} {s.financeSnapshot?`Showing the previous ${s.financeSnapshot.view} read.`:'Financial records have not been read.'}<B data-finance-view={s.financeView}>Retry money view</B></Message>}
          {name==='finances'&&s.financeError&&!s.records.length?<Text>Retry the read to see financial records.</Text>:s.contactSearchError ? (
            <>
              <Message error>
                Couldn’t search people. Your contacts are unchanged. Retry or
                clear the search.
              </Message>
              <B data-retry-contacts="1">Retry search</B>
            </>
          ) : s.contactSearching ? (
            <Text role="status">Searching people…</Text>
          ) : s.contactQuery && name === "contacts" && !s.records.length ? (
            <Text>No people match your search.</Text>
          ) : name==='profile' ? <Profile ctx={ctx}/> : ['contacts','companies'].includes(name)&&s.records.length ? <Directory ctx={ctx} entity={name}/> : name==='services'&&s.records.length ? <Services ctx={ctx}/> : name==='locations'&&s.records.length ? <Places ctx={ctx}/> : (
            <Rows
              ctx={ctx}
              entity={name}
              items={s.records}
              showFinancialDirection={name === "finances"}
            />
          )}{" "}
          {s.nextCursor && !s.contactSearching && !s.contactSearchError && !(name==='finances'&&s.financeError) && (
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
    values = record.fields || {},
    calm = ["tasks", "gigs"].includes(s.page);
  const basics =
    s.page === "tasks"
      ? ["Status", "Due Date", "Priority"]
      : ["Status", "Date", "Call Time", "Set Time", "Requirements"];
  const label = (field) =>
    ({
      "Due Date": "Due date",
      "Do Date": "Plan to work on",
      "Call Time": "Call time",
      "Set Time": "Set time",
      Requirements: "Notes for this gig",
    })[field] || field;
  const [validationError, setValidationError] = React.useState(null);
  const validateTiming = (event) => {
    for (const [field, value] of new FormData(event.currentTarget)) {
      const text = String(value ?? "").trim();
      if (!text || String(values[field] ?? "") === text) continue;
      const isDate = field === "Date" || field.endsWith(" Date");
      const isTime = ["Call Time", "Set Time"].includes(field);
      if (!isDate && !isTime) continue;
      const valid = isDate
        ? Boolean(scheduleEntry({ fields: { Date: text } }).key)
        : /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ||
          (text.includes("T") &&
            !text.includes("/") &&
            Boolean(scheduleEntry({ fields: { Date: text } }).key));
      if (valid) continue;
      event.preventDefault();
      event.stopPropagation();
      setValidationError(
        `${label(field)} must ${isTime ? "use 24-hour HH:mm (00:00–23:59), or a complete ISO timestamp." : "be a real calendar date (YYYY-MM-DD), complete timestamp, or ordered date range."}`,
      );
      const id = `field-${field.replace(/\s+/g, "-").toLowerCase()}`;
      queueMicrotask(() => document.getElementById(id)?.focus());
      return;
    }
    setValidationError(null);
  };
  const editorField = (field) => {
    const raw = values[field] ?? "",
      value =
        s.editorDraft?.[field] ??
        (moneyFields.has(field) && raw !== "" ? Number(raw) / 100 : raw);
    const id = `field-${field.replace(/\s+/g, "-").toLowerCase()}`,
      help = fieldHelp(field, s.currency);
    let opts =
      fieldOptions(s.page, field) ||
      (s.page === "profile" && field === "Currency"
        ? ["USD", "CAD", "EUR", "GBP"]
        : null);
    if (calm && field === "Status")
      opts =
        s.page === "tasks"
          ? ["To do", "In progress", "Waiting", "Done"]
          : ["Tentative", "Confirmed", "Completed", "Cancelled"];
    if (calm && field === "Priority")
      opts = ["Low", "Medium", "High", "Urgent"];
    if (opts) {
      const current = String(
        s.editorDraft?.[field] ??
          (s.page === "tasks" && field === "Status" && !record.id
            ? raw || "To do"
            : raw),
      );
      // Custom statuses and work kinds remain selectable when an existing
      // record does not use one of the suggested values.
      const choices = [...new Set([...opts, ...(current ? [current] : [])])];
      return (
        <Choice
          key={field}
          id={id}
          name={field}
          label={calm ? label(field) : field}
          value={current}
          help={help}
          required={!calm && field !== "Work kind"}
          options={[
            [
              "",
              field === "Work kind"
                ? "Unclassified"
                : calm
                  ? "Not set"
                  : `Choose ${field.toLowerCase()}`,
            ],
            ...choices.map((v) => [v, v]),
          ]}
        />
      );
    }
    if (booleanFields.has(`${s.page}.${field}`))
      return (
        <Choice
          key={field}
          id={id}
          name={field}
          label={field}
          value={String(s.editorDraft?.[field] ?? raw)}
          options={[
            ["", "Not set"],
            ["true", "Yes"],
            ["false", "No"],
          ]}
        />
      );
    const isDate = field === "Date" || field.endsWith(" Date"),
      isTime = ["Call Time", "Set Time"].includes(field);
    const simple =
      !value ||
      (isDate
        ? /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        : isTime
          ? /^\d{2}:\d{2}$/.test(String(value))
          : true);
    const control = (
      <Field
        id={id}
        name={field}
        label={calm ? label(field) : field}
        value={String(value)}
        help={
          isTime ? "Use 24-hour time (HH:mm), or keep the saved timing." : help
        }
        textarea={[
          "Description",
          "Details",
          "Note Details",
          "Requirements",
          "Venue Intel",
          "Summary",
        ].includes(field)}
        type={
          moneyFields.has(field) ? "number" : isDate && simple ? "date" : "text"
        }
        placeholder={isTime && simple ? "HH:mm" : undefined}
      />
    );
    // A saved range or timestamp must survive an unrelated edit exactly. A
    // date-only or clock-only widget would silently truncate its meaning.
    return (isDate || isTime) && !simple ? (
      <VStack key={field} gap={2}>
        <Text type="supporting" color="secondary">
          {calm ? label(field) : field}
        </Text>
        <Text className="gigi-preserve-lines">
          {displayField(field, value, s.currency)}
        </Text>
        <Disclosure title="Adjust saved timing">{control}</Disclosure>
      </VStack>
    ) : (
      <React.Fragment key={field}>{control}</React.Fragment>
    );
  };
  const allFields = fields[s.page] || [];
  const currencyChoice =
    !s.currency &&
    s.page !== "profile" &&
    allFields.some((field) => moneyFields.has(field)) ? (
      <Choice
        id="first-money-currency"
        name="__workspaceCurrency"
        label="Workspace currency"
        value={s.editorDraft?.__workspaceCurrency || ""}
        options={[
          ["", "Choose when adding money"],
          ...["USD", "CAD", "EUR", "GBP"].map((v) => [v, v]),
        ]}
        help="Only needed for amounts. This applies to money in your workspace."
      />
    ) : null;
  return (
    <VStack gap={5} className={calm ? "dev-work-editor" : undefined}>
      <B variant="ghost" data-cancel="1">
        Back
      </B>
      <PageHeading
        title={`${record.id ? "Edit" : calm ? "New" : "Add"} ${entityName(s.page)}`}
        description={
          s.page === "profile"
            ? "Currency cannot change after monetary records are saved."
            : calm
              ? "Add the details you know."
              : "Save the details you know. Leave uncertain fields empty."
        }
      />
      {validationError && <Message error>{validationError}</Message>}
      <form
        onSubmitCapture={validateTiming}
        id="record-form"
        data-entity={s.page}
        data-editor-version={String(ctx.routeVersion)}
      >
        <VStack gap={5}>
          <Field
            key={`${ctx.routeVersion}:title`}
            id="title"
            name="title"
            label={
              s.page === "contacts"
                ? "Name"
                : s.page === "tasks"
                  ? "What needs doing?"
                  : s.page === "gigs"
                    ? "Gig name"
                    : "Title"
            }
            value={s.editorDraft?.title ?? record.title ?? ""}
            required
            maxLength={200}
          />
          {calm ? (
            <>
              <VStack gap={4} className="gigi-form-grid">
                {basics.map(editorField)}
              </VStack>
              <Disclosure title="More details" data-view-key="work-editor-more">
                <VStack gap={4} className="gigi-form-grid">
                  {currencyChoice}
                  {allFields
                    .filter((field) => !basics.includes(field))
                    .map(editorField)}
                </VStack>
              </Disclosure>
            </>
          ) : (
            <VStack gap={4} className="gigi-form-grid">
              {currencyChoice}
              {allFields.map(editorField)}
            </VStack>
          )}
          <HStack gap={3} className="gigi-wrap">
            <B data-cancel="1" disabled={s.busy}>
              Cancel
            </B>
            <B type="submit" primary disabled={s.busy}>
              {s.busy ? "Saving…" : `Save ${entityName(s.page)}`}
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
    calm = ["tasks", "gigs"].includes(s.page),
    basics =
      s.page === "tasks"
        ? ["Due Date", "Do Date", "Status", "Priority"]
        : ["Date", "Call Time", "Set Time", "Status", "Requirements", "Fee"],
    savedFields = Object.entries(r.fields || {}).filter(
      ([, value]) => value !== "" && value != null,
    ),
    detail = calm
      ? {
          primary: basics.flatMap((key) =>
            savedFields.filter(([field]) => field === key),
          ),
          supporting: savedFields.filter(([key]) => !basics.includes(key)),
        }
      : importantDetails(s.page, r.fields || {}),
    links = (r.relations || [])
      .map((link) => relatedEndpoint(link, s.page, r.id))
      .filter(Boolean);
  const rows = (items) => (
    <dl className="gigi-details">
      {items.map(([key, value]) => (
        <React.Fragment key={key}>
          <dt>
            {key === "Do Date"
              ? "Planned date"
              : key === "Venue Intel"
                ? "Venue notes"
                : key}
          </dt>
          <dd>
            {s.page === "schedule" && key === "Date"
              ? (() => {
                  const entry = scheduleEntry(r);
                  return entry.key
                    ? `${new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date(`${entry.key}T12:00:00`))} · ${entry.time} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
                    : displayField(key, value, s.currency);
                })()
              : displayField(key, value, s.currency)}
            {copyableRecordField(key, value) && (
              <B
                variant="ghost"
                data-copy-record-value={value}
                label={`Copy ${key}`}
              >
                Copy
              </B>
            )}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
  const relatedContent = (
    <VStack gap={3}>
      {links.map((link) => (
        <B
          key={`${link.entity}:${link.id}:${link.role}`}
          variant="ghost"
          data-related-entity={link.entity}
          data-related-id={link.id}
        >{`${link.title || pageName(link.entity)} · ${link.role || pageName(link.entity)}`}</B>
      ))}
      {!links.length && (
        <Text color="secondary">
          Connect this record to a person, gig or place.
        </Text>
      )}
      {r.relationsTruncated && (
        <>
          <Text>
            {links.length} of {r.relationCount} links shown.
            {r.relationsError
              ? " Could not load more; saved links are unchanged."
              : ""}
          </Text>
          <B data-relations-more="1" disabled={r.relationsLoading}>
            {r.relationsLoading
              ? "Loading links…"
              : r.relationsError
                ? "Retry loading links"
                : "Load more links"}
          </B>
        </>
      )}
      <B data-link="1">{calm ? "Add related work" : "Link a record"}</B>
    </VStack>
  );
  return (
    <VStack gap={5} className={calm ? "dev-work-detail" : undefined}>
      <B variant="ghost" data-back="1">
        {pageName(s.page)}
      </B>
      <PageHeading
        title={r.title || "Untitled"}
        description={
          calm
            ? s.page === "tasks"
              ? "What needs doing."
              : "Your gig at a glance."
            : `Saved in your private ${pageName(s.page).toLowerCase()} records.`
        }
        actions={
          <>
            {s.page === "tasks" && !finishedTask(r.fields?.Status) && (
              <B data-task-done={r.id} disabled={s.busy}>
                Complete task
              </B>
            )}
            <B data-chat-open="1">Ask GiGi</B>
            <B primary data-edit="1">
              Edit details
            </B>
          </>
        }
      />
      {['contacts','companies'].includes(s.page) && <Panel title="Action items">{links.filter(link=>link.entity==='tasks').length ? <VStack gap={2}>{links.filter(link=>link.entity==='tasks').map(link=><B key={link.id} data-related-entity="tasks" data-related-id={link.id}>{link.title||'Open task'}</B>)}</VStack>:<Text color="secondary">{r.relationsTruncated?'More links may contain action items. Load them in Linked work below.':'No linked tasks yet.'}</Text>}</Panel>}
      {s.page === "schedule" && (
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
            {status(r) || "Saved"}
          </Text>
          {detail.primary.length ? (
            rows(detail.primary)
          ) : (
            <Text color="secondary">No key details added yet.</Text>
          )}
          {s.page === "gigs" && (
            <dl className="gigi-details">
              <dt>Location</dt>
              <dd>
                {links.some((link) => link.entity === "locations") ? (
                  <VStack gap={2}>
                    {links
                      .filter((link) => link.entity === "locations")
                      .map((link) => (
                        <B
                          key={link.id}
                          variant="ghost"
                          data-related-entity={link.entity}
                          data-related-id={link.id}
                        >
                          {link.title || "Open place"}
                        </B>
                      ))}
                    {r.relationsTruncated && (
                      <Text type="supporting" color="secondary">
                        Check related work for more places.
                      </Text>
                    )}
                  </VStack>
                ) : r.relationsTruncated ? (
                  <Text color="secondary">
                    Check related work for more places.
                  </Text>
                ) : (
                  <B data-gig-place="1">Add location</B>
                )}
              </dd>
            </dl>
          )}
          {detail.supporting.length > 0 && (
            <Disclosure
              title={`More details (${detail.supporting.length})`}
              data-view-key="work-detail-more"
            >
              {rows(detail.supporting)}
            </Disclosure>
          )}
        </VStack>
      </section>
      <section>
        <VStack gap={3}>
          <Heading level={2} id="linked-work-heading" tabIndex={-1}>
            {calm ? "Related work" : "Linked work"}
          </Heading>
          {calm ? (
            <Disclosure
              title={`People, tasks and files (${links.length})`}
              data-view-key="work-related"
            >
              {relatedContent}
            </Disclosure>
          ) : (
            relatedContent
          )}
        </VStack>
      </section>
      {s.page === "gigs" && (
        <Disclosure
          title="Payment details"
          data-view-key="gig-money"
          className="dev-work-supporting"
        >
          <Panel title="Balance due">
            <Heading level={2}>
              {s.summaryUnavailable ? "Unavailable" : gigBalance(s.summary)}
            </Heading>
            {(!s.summary?.financialsComplete || s.summaryUnavailable) && (
              <Text color="secondary">
                {s.summaryUnavailable
                  ? "Financial summary unavailable. Reopen the record to check again."
                  : "Financial details incomplete"}
              </Text>
            )}
          </Panel>
        </Disclosure>
      )}
      {s.page === "gigs" && (
        <Disclosure
          title="Artwork"
          data-view-key="gig-artwork"
          className="dev-work-supporting"
        >
          <ArtworkManager
            ctx={ctx}
            entity={s.page}
            item={r}
            onChanged={() => ctx.actions.selectRecord(r.id, s.page)}
          />
        </Disclosure>
      )}
      {canUseSource(s.page, r) && (
        <Panel title="Use this source">
          <Text>
            Review a local task or gig linked to this imported record.
          </Text>
          <HStack gap={2}>
            <B data-source-propose="tasks">Create task from source</B>
            <B data-source-propose="gigs">Create gig from source</B>
          </HStack>
        </Panel>
      )}
      {r.source?.kind && r.source.kind !== "manual" && (
        <Panel title="Source">
          <Text>
            {r.source.provider === "gmail"
              ? "Gmail"
              : r.source.provider === "googlecalendar"
                ? "Google Calendar"
                : "Connected source"}
          </Text>
          <Text color="secondary">
            Imported source text is context to review, not instructions or a
            verified current fact.
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
      ...new Set(
        (s.relationSchema?.relationFields || []).map((f) => f.targetEntity),
      ),
    ].filter((name) => name !== s.page || s.page === "tasks"),
    selected = s.linkChoices?.entity || candidates[0],
    roles = (s.relationSchema?.relationFields || []).filter(
      (f) => f.targetEntity === selected,
    );
  if (s.page === "gigs" && s.linkPurpose === "place")
    return (
      <VStack gap={5}>
        <B data-link-cancel="1">Record</B>
        <PageHeading
          title="Add a location"
          description="Choose an existing place in your private workspace."
        />
        {s.linkChoices?.items?.length ? (
          <form id="link-form" noValidate>
            <VStack gap={4}>
              <input
                type="hidden"
                id="link-entity"
                name="entity"
                value="locations"
              />
              <input
                type="hidden"
                id="link-role"
                name="role"
                value="Location"
              />
              <Choice
                key="record-locations"
                id="link-record"
                name="id"
                label="Place"
                required
                options={[
                  ["", "Choose a place"],
                  ...(s.linkChoices?.items || []).map((r) => [r.id, r.title]),
                ]}
              />
              {s.linkChoices?.nextCursor && (
                <B data-link-more="1">Load more places</B>
              )}
              <B primary data-link-submit="1" disabled={s.busy}>
                Add location
              </B>
            </VStack>
          </form>
        ) : (
          <Text>
            No places yet. Add one under Network → Places, then return to this
            gig.
          </Text>
        )}
      </VStack>
    );
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
              value={roles[0]?.name || ""}
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
                ["", "Choose a record"],
                ...(s.linkChoices?.items || []).map((r) => [r.id, r.title]),
              ]}
            />
            {s.linkChoices?.nextCursor && (
              <B data-link-more="1">Load more records</B>
            )}
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
      <PageHeading
        title="History"
        description="Recent changes in this private workspace."
      />
      <Conversations ctx={ctx} />
      <Heading level={2}>Workspace activity</Heading>
      {ctx.state.history.length ? (
        ctx.state.history.map((item, index) => {
          const receipt = historyPresentation(item);
          return (
            <B
              key={item.id || index}
              variant="ghost"
              className="gigi-record-row"
              data-open={
                fields[item.entity] && item.recordId ? item.recordId : undefined
              }
              data-entity={item.entity}
              label={receipt.action}
            >
              <VStack gap={1}>
                <Text weight="semibold">{receipt.action}</Text>
                <Text>
                  {receipt.detail || pageName(item.entity || "workspace")}
                </Text>
                <Text type="supporting" color="secondary">
                  {receipt.time}
                </Text>
              </VStack>
            </B>
          );
        })
      ) : (
        <Text>
          No activity yet. Changes to your workspace will appear here.
        </Text>
      )}
    </VStack>
  );
}
