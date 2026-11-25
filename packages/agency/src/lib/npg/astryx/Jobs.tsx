import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Section } from '@astryxdesign/core/Section';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Selector } from '@astryxdesign/core/Selector';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Disclosure } from './Disclosure';
import { MARKET_STATES, MARKET_MAP_VIEWBOX } from '../assets/us-states';

type Job = {
  id: string;
  title: string;
  employer: string | null;
  city: string | null;
  state: string | null;
  location_text: string | null;
  specialty: string | null;
  employment_type: string | null;
  pay_text: string | null;
  status: string;
  source_url: string | null;
  application_url: string | null;
  posted_at: string | null;
  last_seen_at: string | null;
  fetched_at: string | null;
};
type JobsData = {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
  states: { state: string; count: number }[];
  specialties: { specialty: string; count: number }[];
  freshness: { lastSeenAt: string | null; fetchedAt: string | null };
};
const date = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Not recorded';
const stale = (value: string | null) =>
  !value || !Number.isFinite(Date.parse(value)) || Date.now() - Date.parse(value) > 7 * 86400000;
const url = (value: string | null) => {
  try {
    const parsed = new URL(value || '');
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
};
export function Jobs({ onBack }: { onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<JobsData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    const params = new URLSearchParams({
      q: search,
      state,
      specialty,
      status: 'open',
      limit: '25',
      offset: String(offset)
    });
    fetch('/api/abundance/healthcare-providers/jobs?' + params, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
          throw new Error('Job listings could not be loaded. Try again in a moment.');
        const body = await response.json();
        if (!body.success || !body.data) throw new Error('Job listings could not be loaded.');
        return body.data as JobsData;
      })
      .then((next) => {
        if (!controller.signal.aborted) setData(next);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, state, specialty, offset, attempt]);
  const counts = useMemo(
    () => new Map(data?.states.map((item) => [item.state, item.count]) || []),
    [data]
  );
  const max = Math.max(1, ...counts.values());
  const selectState = (value: string) => {
    setState(value);
    setOffset(0);
  };
  return (
    <Section
      padding={4}
      variant="transparent"
      className="min-w-0 overflow-y-auto bg-workspace-canvas"
      aria-label="Healthcare jobs"
    >
      <VStack gap={3} className="max-w-screen-xl mx-auto w-full">
        <HStack justify="between" align="center" gap={3} wrap="wrap">
          <VStack gap={2} className="min-w-0 w-full md:w-auto md:flex-1">
          <Heading level={1} className="!text-3xl md:!text-4xl !tracking-tight" ref={heading} tabIndex={-1}>
            Jobs
          </Heading>
          <Text color="secondary">
            Explore public healthcare openings by market. Confirm availability with the original
            source.
          </Text>
        </VStack>
          <Button size="sm" variant="ghost" label="Back to conversations" onClick={onBack} />
        </HStack>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(query.trim());
            setOffset(0);
          }}
        >
          <HStack gap={2} wrap="wrap" align="end">
            <VStack gap={1} className="flex-1 min-w-0">
              <label htmlFor="npg-job-search">Search openings</label>
              <input
                id="npg-job-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Role, employer or location"
                className="w-full rounded-md border border-default bg-surface p-3 text-primary"
              />
            </VStack>
            <Button label="Search jobs" type="submit" />
          </HStack>
        </form>
        <Grid columns={1} gap={2} className="md:grid-cols-2">
          <Selector
            label="State"
            value={state || 'all'}
            onChange={(value) => selectState(value === 'all' ? '' : value)}
            hasSearch
            presentation="adaptive"
            width="100%"
            options={[
              { value: 'all', label: 'All states' },
              ...MARKET_STATES.map((item) => ({ value: item.code, label: item.name }))
            ]}
          />
          <Selector
            label="Specialty"
            value={specialty || 'all'}
            onChange={(value) => {
              setSpecialty(value === 'all' ? '' : value);
              setOffset(0);
            }}
            presentation="adaptive"
            width="100%"
            options={[
              { value: 'all', label: 'All specialties' },
              ...(data?.specialties || [])
                .filter((item) => item.specialty)
                .map((item) => ({ value: item.specialty, label: item.specialty }))
            ]}
          />
        </Grid>
        {(search || state || specialty) && (
          <Button
            variant="ghost"
            size="sm"
            label="Clear filters"
            onClick={() => {
              setQuery('');
              setSearch('');
              setState('');
              setSpecialty('');
              setOffset(0);
            }}
          />
        )}
        {loading && <Text role="status">Loading public openings…</Text>}
        {error && (
          <VStack gap={2}>
            <Banner status="error" title="Jobs unavailable" description={error} />
            <Button label="Try again" onClick={() => setAttempt((value) => value + 1)} />
          </VStack>
        )}
        {data && (
          <>
            <VStack gap={3}>

              <VStack gap={2}>
                <Heading level={2}>
                  {data.total.toLocaleString()} public opening{data.total === 1 ? '' : 's'}
                  {state
                    ? ` in ${MARKET_STATES.find((item) => item.code === state)?.name || state}`
                    : ''}
                </Heading>
                <Text color="secondary">
                  Latest source observation: {date(data.freshness.lastSeenAt)} · Dataset fetched:{' '}
                  {date(data.freshness.fetchedAt)}
                </Text>
                {stale(data.freshness.lastSeenAt) && (
                  <Banner
                    status="warning"
                    title="Source observations are stale"
                    description="The latest recorded observation is older than seven days or unavailable. Listings may have closed; verify every opening at its source."
                  />
                )}
                <Text>
                  Public listings are a sourcing signal. They do not establish candidate supply or
                  complete market demand.
                </Text>
              </VStack>
              <Disclosure trigger="Explore openings on the map">
              <Section padding={3} variant="section" className="min-w-0 !m-0">
                <VStack gap={2}>
                  <Heading level={2}>Openings by state</Heading>
                  <Text color="secondary">
                    Select a state to filter. Counts reflect the current search and specialty,
                    before the state filter.
                  </Text>
                  <svg
                    viewBox={MARKET_MAP_VIEWBOX}
                    width="100%"
                    className="block w-full h-auto max-h-64"
                    role="img"
                    aria-label="United States openings by state. Use the State selector for keyboard access. Alaska and Hawaii are insets."
                  >
                    {MARKET_STATES.map((item) => (
                      <path
                        key={item.code}
                        d={item.path}
                        fill={
                          counts.get(item.code)
                            ? 'var(--color-accent)'
                            : 'var(--color-background-muted)'
                        }
                        fillOpacity={
                          counts.get(item.code) ? 0.25 + (0.75 * counts.get(item.code)!) / max : 1
                        }
                        stroke={
                          state === item.code
                            ? 'var(--color-text-primary)'
                            : 'var(--color-text-secondary)'
                        }
                        strokeWidth={state === item.code ? 2 : 0.6}
                        vectorEffect="non-scaling-stroke"
                        onClick={() => selectState(state === item.code ? '' : item.code)}
                      >
                        <title>
                          {item.name}: {counts.get(item.code) || 0} public openings
                        </title>
                      </path>
                    ))}
                  </svg>
                  <Text color="secondary">
                    Darker blue means more listed openings. Gray means no mapped listings in this
                    dataset, not no hiring demand. Locations without a recognized state remain in
                    the all-states list.
                  </Text>
                </VStack>
              </Section>
              </Disclosure>
            </VStack>
            {data.jobs.length === 0 ? (
              <Banner
                status="info"
                title="No openings match these filters"
                description="Try a broader role, clear the specialty, or choose All states."
              />
            ) : (
              <List aria-label="Public job openings">
                {data.jobs.map((job) => (
                  <ListItem
                    key={job.id}
                    label={
                      <VStack gap={1} className="w-full min-w-0 break-words">
                        <Heading level={3}>{job.title}</Heading>
                        <Text weight="semibold">
                          {job.employer || 'Employer not provided'} ·{' '}
                          {job.location_text ||
                            [job.city, job.state].filter(Boolean).join(', ') ||
                            'Location not provided'}
                        </Text>
                        <Text color="secondary">
                          {[job.specialty, job.employment_type, job.pay_text]
                            .filter(Boolean)
                            .join(' · ') || 'Additional role details at source'}
                        </Text>
                        <Text color="secondary">
                          Posted: {date(job.posted_at)} · Last seen: {date(job.last_seen_at)}
                          {stale(job.last_seen_at)
                            ? ' · Stale: verify availability'
                            : ' · Seen within seven days'}
                        </Text>
                        <HStack gap={3} wrap="wrap">
                          {url(job.source_url) && (
                            <Link
                              href={url(job.source_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View source
                            </Link>
                          )}
                          {url(job.application_url) && job.application_url !== job.source_url && (
                            <Link
                              href={url(job.application_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View application
                            </Link>
                          )}
                          {!url(job.source_url) && !url(job.application_url) && (
                            <Text color="secondary">Source link unavailable</Text>
                          )}
                        </HStack>
                      </VStack>
                    }
                  />
                ))}
              </List>
            )}
            <HStack gap={2} wrap="wrap">
              <Text role="status">
                {data.total
                  ? `${offset + 1}–${Math.min(offset + data.jobs.length, data.total)} of ${data.total}`
                  : '0 results'}
              </Text>
              <Button
                label="Previous jobs"
                size="sm"
                variant="ghost"
                isDisabled={offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - 25))}
              />
              <Button
                label="Next jobs"
                size="sm"
                variant="ghost"
                isDisabled={offset + data.jobs.length >= data.total}
                onClick={() => setOffset((value) => value + 25)}
              />
            </HStack>
          </>
        )}
        <Disclosure trigger="Connect the Jobs MCP">
          <VStack gap={2}>
            <Text>
              Use the public, read-only Jobs MCP in an MCP-compatible client. It searches the same
              public jobs dataset; it does not access your private conversations or submit
              applications.
            </Text>
            <Text className="break-all">
              https://abundance-jobs-mcp.createsomething.workers.dev/chatgpt/mcp
            </Text>
            <Text>
              Available tools: search, fetch, list_public_jobs, search_public_jobs, get_job and
              summarize_job_markets. Add the address as a remote MCP connection, then ask for
              healthcare openings by location or specialty.
            </Text>
            <Button
              label="Copy MCP address"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!navigator.clipboard) {
                  setCopied('Select the address above to copy it.');
                  return;
                }
                navigator.clipboard
                  .writeText('https://abundance-jobs-mcp.createsomething.workers.dev/chatgpt/mcp')
                  .then(() => setCopied('MCP address copied'))
                  .catch(() => setCopied('Copy unavailable. Select the address above to copy it.'));
              }}
            />
            <Text role="status">{copied}</Text>
          </VStack>
        </Disclosure>
      </VStack>
    </Section>
  );
}
