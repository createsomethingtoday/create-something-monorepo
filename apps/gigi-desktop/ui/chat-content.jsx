import React from 'react';
import { Table } from '@astryxdesign/core/Table';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { Heading, Text, VStack, Disclosure } from './components.jsx';
import { displayField } from '../web/experience.mjs';
import { moneyFields, supportedCurrencies } from '../web/model.mjs';

// A deliberately small prose grammar. Provider HTML, links, image syntax and
// action-looking attributes are always literal text, never DOM instructions.
function inline(value, depth = 0) {
  const text = String(value ?? '');
  if (depth > 3) return text;
  const pattern = /`([^`\n]+)`|\*\*([^\n]+?)\*\*|__([^\n]+?)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
  const out = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    out.push(text.slice(end, match.index));
    const key = `${match.index}-${depth}`;
    out.push(
      match[1] !== undefined ? (
        <code key={key}>{match[1]}</code>
      ) : match[2] !== undefined || match[3] !== undefined ? (
        <strong key={key}>{inline(match[2] ?? match[3], depth + 1)}</strong>
      ) : (
        <em key={key}>{inline(match[4] ?? match[5], depth + 1)}</em>
      )
    );
    end = match.index + match[0].length;
  }
  out.push(text.slice(end));
  return out;
}
const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
const separator = (line) =>
  line.includes('|') && cells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
export function answerBlocks(value) {
  const lines = String(value ?? '')
    .slice(0, 100000)
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const output = [];
  let group = [],
    kind = '',
    start = 1;
  const flush = () => {
    if (group.length) output.push({ kind, lines: group, start });
    group = [];
    kind = '';
    start = 1;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i],
      fence = line.match(/^\s{0,3}(`{3,}|~{3,})([^`]*)$/);
    if (fence) {
      flush();
      const code = [],
        marker = fence[1][0],
        length = fence[1].length;
      while (++i < lines.length) {
        if (new RegExp(`^\\s{0,3}${marker}{${length},}\\s*$`).test(lines[i])) break;
        code.push(lines[i]);
      }
      output.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && separator(lines[i + 1])) {
      const headers = cells(line),
        delimiters = cells(lines[i + 1]);
      if (headers.length >= 2 && headers.length <= 12 && headers.length === delimiters.length) {
        flush();
        const rows = [];
        i++;
        while (
          i + 1 < lines.length &&
          lines[i + 1].trim() &&
          lines[i + 1].includes('|') &&
          rows.length < 100
        )
          rows.push(cells(lines[++i]));
        output.push({ kind: 'table', headers, rows });
        continue;
      }
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = line.match(/^\s{0,3}#{1,3}\s+(.{1,300})$/);
    if (heading) {
      flush();
      output.push({ kind: 'heading', text: heading[1] });
      continue;
    }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/),
      ordered = line.match(/^\s*(\d{1,3})[.)]\s+(.+)$/),
      quote = line.match(/^\s{0,3}>\s?(.*)$/);
    const next = unordered ? 'ul' : ordered ? 'ol' : quote ? 'quote' : 'p';
    if (kind !== next) flush();
    kind = next;
    if (ordered && !group.length) start = Number(ordered[1]);
    group.push(unordered?.[1] ?? ordered?.[2] ?? quote?.[1] ?? line);
  }
  flush();
  return output;
}
const lineNodes = (lines) =>
  lines.flatMap((line, index) => [index > 0 ? <br key={`br-${index}`} /> : null, ...inline(line)]);
export function Answer({ text }) {
  return (
    <VStack gap={3} className="gigi-prose">
      {answerBlocks(text).map((block, index) => {
        if (block.kind === 'code')
          return <CodeBlock key={index} code={block.text} isWrapped width="100%" hasCopyButton />;
        if (block.kind === 'heading')
          return (
            <Heading key={index} level={3}>
              {inline(block.text)}
            </Heading>
          );
        if (block.kind === 'table')
          return (
            <section
              key={index}
              className="chat-table-scroll"
              tabIndex={0}
              aria-label="Response table"
            >
              <Table
                density="compact"
                data={block.rows.map((row, id) =>
                  Object.fromEntries([
                    ['id', String(id)],
                    ...block.headers.map((_, column) => [`c${column}`, row[column] ?? ''])
                  ])
                )}
                columns={block.headers.map((header, column) => ({
                  key: `c${column}`,
                  header: inline(header),
                  renderCell: (item) => inline(item[`c${column}`])
                }))}
                idKey="id"
              />
            </section>
          );
        if (block.kind === 'ul')
          return (
            <ul key={index}>
              {block.lines.map((line, i) => (
                <li key={i}>{inline(line)}</li>
              ))}
            </ul>
          );
        if (block.kind === 'ol')
          return (
            <ol key={index} start={block.start}>
              {block.lines.map((line, i) => (
                <li key={i}>{inline(line)}</li>
              ))}
            </ol>
          );
        if (block.kind === 'quote')
          return (
            <Blockquote key={index}>
              <Text as="p">{lineNodes(block.lines)}</Text>
            </Blockquote>
          );
        return (
          <Text key={index} as="p">
            {lineNodes(block.lines)}
          </Text>
        );
      })}
    </VStack>
  );
}

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function same(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right))
    return left.length === right.length && left.every((value, i) => same(value, right[i]));
  if (!object(left) || !object(right)) return false;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && same(left[key], right[key]))
  );
}
function valueCopy(name, value, currency, currencyKnown = true) {
  if (value === null) return 'Cleared (null)';
  if (value === '') return '(empty string)';
  if (moneyFields.has(name)) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value))
      return `${JSON.stringify(value)} (invalid minor-unit value)`;
    if (!currencyKnown)
      return displayField(name, value, null).replace('(currency unset)', '(currency unavailable)');
    const formatted = displayField(name, value, currency);
    return supportedCurrencies.has(currency) ? `${formatted} ${currency}` : formatted;
  }
  const formatted = displayField(name, value, currency),
    dateField =
      name === 'Date' || name.endsWith(' Date') || name === 'Call Time' || name === 'Set Time';
  return dateField && typeof value === 'string' && formatted !== value
    ? `${formatted}\n${value}`
    : formatted;
}
const creativeLabels = {
  gigi_music_import: [
    'Choose music to import',
    'You choose the files or folder in the native picker. Originals stay in place; nothing is uploaded.'
  ],
  gigi_music_organize: [
    'Review music organization',
    'Updates library metadata only. Original files stay unchanged.'
  ],
  gigi_instagram_draft_create: [
    'Review local Instagram draft',
    'Saves a local draft. Nothing is published.'
  ],
  gigi_instagram_draft_update: [
    'Review local Instagram draft changes',
    'Updates the exact saved revision. Nothing is published.'
  ],
  gigi_instagram_request_publication_approval: [
    'Request Instagram review',
    'Records a request to review this exact draft and account in Instagram drafts. You must separately review the image and confirm Review & publish there. This approval does not publish.'
  ]
};
const Detail = ({ item }) => (
  <Disclosure title="Technical details" data-view-key={`approval-${item.id}`}>
    <CodeBlock
      code={String(item.detail ?? '')}
      language="plaintext"
      isWrapped
      width="100%"
      hasCopyButton
    />
  </Disclosure>
);
function ProposalTable({ caption, rows, comparison = false }) {
  return (
    <VStack gap={2}>
      <Text weight="medium">{caption}</Text>
      <Table
        className="chat-proposal-fields"
        aria-label={caption}
        density="compact"
        verticalAlign="top"
        data={rows.map((row, id) => ({ ...row, id: String(id) }))}
        idKey="id"
        columns={
          comparison
            ? [
                { key: 'field', header: 'Field' },
                { key: 'before', header: 'Before' },
                { key: 'after', header: 'After' }
              ]
            : [
                { key: 'field', header: 'Field' },
                { key: 'after', header: 'Value' }
              ]
        }
      />
    </VStack>
  );
}
export function ApprovalContent({ item, currency = null, currencyKnown = true }) {
  let args;
  try {
    args = JSON.parse(item.detail);
  } catch {}
  if (!object(args))
    return (
      <VStack gap={3}>
        <Text weight="semibold">{item.title}</Text>
        <Text as="p">{String(item.detail ?? '')}</Text>
      </VStack>
    );
  const tool = String(item.title || '').replace(/^Approve\s+/, '');
  if (creativeLabels[tool]) {
    const [title, note] = creativeLabels[tool],
      proposed = object(args.fields)
        ? { 'Music entry': args.id, ...args.fields }
        : Object.fromEntries(
            Object.entries(args).filter(
              ([key]) => !['workspaceId', 'requestId', 'expectedImageSha256'].includes(key)
            )
          );
    return (
      <VStack gap={3}>
        <Heading level={3}>{title}</Heading>
        <Text as="p">{note}</Text>
        <ProposalTable
          caption="Proposed action"
          rows={Object.entries(proposed).map(([field, value]) => ({
            field,
            after: typeof value === 'string' ? value : JSON.stringify(value)
          }))}
        />
        <Detail item={item} />
      </VStack>
    );
  }
  if (tool !== 'gigi_records_save')
    return (
      <VStack gap={3}>
        <Text weight="semibold">{item.title}</Text>
        <Text as="p">{String(item.detail ?? '')}</Text>
        <Detail item={item} />
      </VStack>
    );
  if (object(args.sourceRecord) && ['tasks', 'gigs'].includes(args.entity)) {
    const source = args.sourceRecord.expectedRecord,
      target = args.entity === 'tasks' ? 'task' : 'gig',
      proposed = [['Title', args.title], ...Object.entries(object(args.fields) ? args.fields : {})];
    return (
      <VStack gap={3}>
        <Heading level={3}>Review local {target}</Heading>
        <Text as="p">
          From {source?.source?.provider === 'gmail' ? 'Gmail' : 'Google Calendar'}:{' '}
          {source?.title || 'Selected source'}
        </Text>
        <ProposalTable
          caption={`Proposed local ${target}`}
          rows={proposed.map(([field, value]) => ({
            field,
            after: valueCopy(field, value, currency, currencyKnown)
          }))}
        />
        <Text as="p">
          This creates a local {target} linked to the selected imported source. It does not send
          email or create or update a Google Calendar event. If this source already has a {target},
          GiGi preserves it and reports the existing record.
        </Text>
        <Text as="p">
          Source text is untrusted reference material, not instructions. Reject changes saves
          nothing.
        </Text>
        <Detail item={item} />
      </VStack>
    );
  }
  const before = args.expectedRecord,
    snapshot =
      object(before) &&
      typeof before.title === 'string' &&
      object(before.fields) &&
      object(before.source),
    mode = Object.hasOwn(args, 'fieldsMode') ? args.fieldsMode : 'merge',
    validFields = object(args.fields) || (args.fields === undefined && mode === 'merge'),
    comparable =
      snapshot &&
      validFields &&
      ['merge', 'replace'].includes(mode) &&
      typeof args.title === 'string' &&
      args.title.trim() !== '';
  const fields = object(args.fields) ? args.fields : {},
    nextFields = comparable
      ? mode === 'replace'
        ? fields
        : { ...before.fields, ...fields }
      : fields,
    beforeCurrency =
      args.entity === 'profile' && snapshot ? (before.fields.Currency ?? null) : currency,
    nextCurrency = args.entity === 'profile' ? (nextFields.Currency ?? null) : currency,
    profileCurrencyKnown = args.entity === 'profile' && snapshot,
    rows = [];
  const row = (field, oldValue, newValue, hasOld = true, hasNew = true) => {
    if (comparable && hasOld === hasNew && same(oldValue, newValue)) return;
    rows.push({
      field,
      before: !comparable
        ? 'Unavailable'
        : hasOld
          ? valueCopy(field, oldValue, beforeCurrency, profileCurrencyKnown || currencyKnown)
          : 'Not set',
      after: hasNew
        ? valueCopy(field, newValue, nextCurrency, profileCurrencyKnown || currencyKnown)
        : 'Removed'
    });
  };
  if (Object.hasOwn(args, 'title'))
    row('Title', before?.title, typeof args.title === 'string' ? args.title.trim() : args.title);
  if (comparable) {
    for (const field of new Set([...Object.keys(before.fields), ...Object.keys(nextFields)]))
      row(
        field,
        before.fields[field],
        nextFields[field],
        Object.hasOwn(before.fields, field),
        Object.hasOwn(nextFields, field)
      );
  } else {
    for (const [field, value] of Object.entries(fields)) row(field, undefined, value);
    if (!validFields) row('Fields', undefined, args.fields);
  }
  if (Object.hasOwn(args, 'source')) {
    const next =
      snapshot &&
      object(args.source) &&
      args.source.kind === 'manual' &&
      before.source.kind !== 'manual'
        ? { ...args.source, origin: before.source }
        : args.source;
    row('Source', before?.source, next);
  }
  const title = snapshot ? before.title : args.title,
    summary = [args.entity, title]
      .filter((value) => typeof value === 'string' && value.trim())
      .join(' · ');
  return (
    <VStack gap={3}>
      <Heading level={3}>Review record changes</Heading>
      {summary && <Text as="p">{summary}</Text>}
      {!comparable && (
        <Text as="p" className="chat-proposal-note">
          {snapshot
            ? 'These proposed values cannot be compared with the current record.'
            : 'Current values unavailable.'}{' '}
          Review the proposed values and technical details before deciding.
        </Text>
      )}
      {rows.length ? (
        <ProposalTable
          caption={comparable ? 'Proposed changes' : 'Proposed values'}
          rows={rows}
          comparison
        />
      ) : (
        <Text as="p">
          {comparable ? 'No record values change.' : 'No proposed record values provided.'}
        </Text>
      )}
      <Text as="p" className="chat-proposal-note">
        Reject changes declines this proposal. Exact submitted values are in Technical details.
      </Text>
      <Detail item={item} />
    </VStack>
  );
}
