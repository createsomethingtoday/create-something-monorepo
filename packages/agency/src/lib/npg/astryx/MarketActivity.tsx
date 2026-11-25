import React, { useEffect, useRef, useState } from 'react';
import { Section } from '@astryxdesign/core/Section';
import { VStack } from '@astryxdesign/core/VStack';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { List, ListItem } from '@astryxdesign/core/List';
import { Disclosure } from './Disclosure';
import type { MarketActivitySummary } from '../market';
const MarketMap = React.lazy(() =>
  import('./MarketMap').then((module) => ({ default: module.MarketMap }))
);
class MapBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Text role="alert">
        The map could not be loaded. Choose List to continue comparing your saved activity.
      </Text>
    ) : (
      this.props.children
    );
  }
}

const counted = (value: number, noun: string) =>
  `${value.toLocaleString('en-US')} ${noun}${value === 1 ? '' : noun === 'search' ? 'es' : 's'}`;
const matches = (value: {
  searches: number;
  unknownResultCounts: number;
  matchingResults: number;
}) =>
  value.searches === 0 || value.unknownResultCounts === value.searches
    ? 'Matches unknown'
    : `${value.matchingResults.toLocaleString('en-US')} matches`;
const number = (value: number) => value.toLocaleString('en-US');
export function MarketActivity({
  onBack,
  onResearch
}: {
  onBack: () => void;
  onResearch?: (locale: string) => void;
}) {
  const [sort, setSort] = useState<'searches' | 'matchingResults' | 'exportsPrepared'>('searches');
  const [view, setView] = useState<'list' | 'map'>('list');
  const heading = useRef<HTMLHeadingElement>(null);
  const [data, setData] = useState<MarketActivitySummary | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setData(null);
    fetch('/delivery/abundance/healthcare-analyst/api?view=market', {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
          throw new Error(
            'Market activity could not be loaded. Your saved conversations are still available.'
          );
        return response.json() as Promise<MarketActivitySummary>;
      })
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || 'Market activity could not be loaded.');
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <Section
      padding={4}
      variant="transparent"
      className="min-w-0 overflow-y-auto bg-workspace-canvas"
      aria-label="Private market activity"
    >
      <VStack gap={3} className="max-w-screen-xl mx-auto w-full">
        <HStack justify="between" align="center" gap={3} wrap="wrap">
          <VStack gap={2} className="min-w-0 w-full md:w-auto md:flex-1">
          <Heading level={1} className="!text-3xl md:!text-4xl !tracking-tight" ref={heading} tabIndex={-1}>
            Market activity
          </Heading>
          <Text color="secondary">Private sourcing history · activity, not hiring demand.</Text>
        </VStack>
          <Button variant="ghost" size="sm" onClick={onBack} label="Back to conversations" />
        </HStack>
        {!data && !error && <Text role="status">Loading your market activity…</Text>}
        {error && (
          <VStack gap={3}>
            <Banner status="error" title="Activity unavailable" description={error} />
            <Button onClick={() => setAttempt((value) => value + 1)} label="Try again" />
          </VStack>
        )}
        {data && (
          <>
            {data.limitations
              .filter((value) =>
                /5000|5,000|partial|truncat|most recent|limit reached/i.test(value)
              )
              .map((value, index) => (
                <Banner key={index} status="info" title="Partial history" description={value} />
              ))}
            <Grid columns={3} gap={2} aria-label="Activity totals">
              <VStack padding={2} gap={1} className="rounded-xl bg-surface"><Text color="secondary">Searches</Text><Text size="2xl" weight="semibold">{number(data.totals.searches)}</Text><Text type="supporting" color="secondary" className="hidden md:block">Your research activity</Text></VStack>
              <VStack padding={2} gap={1} className="rounded-xl bg-surface"><Text color="secondary">Matches</Text><Text size="2xl" weight="semibold">{matches(data.totals)}</Text><Text type="supporting" color="secondary" className="hidden md:block">Across saved searches</Text></VStack>
              <VStack padding={2} gap={1} className="rounded-xl bg-surface"><Text color="secondary">Exports</Text><Text size="2xl" weight="semibold">{number(data.totals.exportsPrepared)}</Text><Text type="supporting" color="secondary" className="hidden md:block">Download from the source conversation</Text></VStack>
            </Grid>
            {data.locales.length === 0 ? (
              <Banner
                status="info"
                title="No saved market activity yet"
                description="Run a location-based registry search in a conversation. Its saved results will appear here; no additional search or paid provider call is needed to view this page."
              />
            ) : (
              <VStack gap={1}>
                <Heading level={2} className="sr-only">Compare locales</Heading>
                <HStack gap={1} wrap="wrap" aria-label="Activity view">
                  <Button
                    size="sm"
                    label="List"
                    variant={view === 'list' ? 'primary' : 'ghost'}
                    aria-pressed={view === 'list'}
                    onClick={() => setView('list')}
                  />
                  <Button
                    size="sm"
                    label="Map"
                    variant={view === 'map' ? 'primary' : 'ghost'}
                    aria-pressed={view === 'map'}
                    onClick={() => setView('map')}
                  />
                  <HStack gap={1} wrap="wrap" aria-label="Sort locales">
                    {(['searches', 'matchingResults', 'exportsPrepared'] as const).map((metric) => (
                      <Button
                        size="sm"
                        key={metric}
                        label={
                          metric === 'searches'
                            ? 'Most searches'
                            : metric === 'matchingResults'
                              ? 'Most matches'
                              : 'Most exports'
                        }
                        variant={sort === metric ? 'primary' : 'ghost'}
                        aria-pressed={sort === metric}
                        onClick={() => setSort(metric)}
                      />
                    ))}
                  </HStack>
                </HStack>
                {view === 'map' ? (
                  <MapBoundary>
                    <React.Suspense fallback={<Text role="status">Loading state map…</Text>}>
                      <MarketMap data={data} metric={sort} onResearch={onResearch} />
                    </React.Suspense>
                  </MapBoundary>
                ) : (
                  <List aria-label="Locale comparison">
                    {[...data.locales]
                      .sort((a, b) => b[sort] - a[sort] || a.locale.localeCompare(b.locale))
                      .map((locale) => (
                        <ListItem
                          key={locale.locale}
                          label={
                            <VStack gap={1} className="min-w-0 w-full">
                              <HStack justify="between" gap={2} align="center">
                                <Heading level={3}>{locale.locale}</Heading>
                                <Text weight="semibold">
                                  {sort === 'matchingResults'
                                    ? matches(locale)
                                    : `${number(locale[sort])} ${sort === 'searches' ? (locale[sort] === 1 ? 'search' : 'searches') : 'prepared'}`}
                                </Text>
                              </HStack>
                              <Grid columns={2} gap={2} className="md:grid-cols-4">
                                <Text>{counted(locale.searches, 'search')}</Text>
                                <Text>{matches(locale)}</Text>
                                <Text>{counted(locale.exportsRequested, 'export request')}</Text>
                                <Text>{number(locale.exportsPrepared)} prepared</Text>
                              </Grid>
                              <HStack gap={2} wrap="wrap" justify="start">
                                {onResearch &&
                                  /^(?:[A-Za-z .'-]+, )?[A-Z]{2}$/.test(locale.locale) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      label={`Research ${locale.locale}`}
                                      onClick={() => onResearch(locale.locale)}
                                    />
                                  )}
                              </HStack>
                              <Disclosure trigger="Source quality and dates">
                                <Text color="secondary">
                                  {counted(locale.incompleteSearches, 'search')} flagged incomplete
                                  · {counted(locale.unknownResultCounts, 'unknown result count')}
                                </Text>
                                <Text color="secondary">
                                  Source snapshot: {locale.sourceFetchedAt || 'not recorded'} ·
                                  Latest saved search:{' '}
                                  {locale.latestSearchAt
                                    ? new Date(locale.latestSearchAt).toLocaleDateString('en-US')
                                    : 'not recorded'}
                                </Text>
                              </Disclosure>
                            </VStack>
                          }
                        />
                      ))}
                  </List>
                )}
              </VStack>
            )}
            <Disclosure trigger="How to read this comparison">
              <Text color="secondary">
                Matching results add each search’s reported count; repeat candidates can be counted
                again. Prepared exports are server responses, not confirmed downloads.
              </Text>
              {data.limitations.map((limitation, index) => (
                <Text key={index} color="secondary">
                  {limitation}
                </Text>
              ))}
            </Disclosure>
          </>
        )}
      </VStack>
    </Section>
  );
}
