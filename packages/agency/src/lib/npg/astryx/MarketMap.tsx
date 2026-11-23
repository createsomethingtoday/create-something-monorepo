import React, { useId, useMemo, useState } from 'react';
import { Section } from '@astryxdesign/core/Section';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { Selector } from '@astryxdesign/core/Selector';
import { List, ListItem } from '@astryxdesign/core/List';
import { Disclosure } from './Disclosure';
import type { MarketActivitySummary, MarketLocale, MarketMetrics } from '../market';
import {
  MARKET_STATES,
  MARKET_MAP_VIEWBOX,
  projectMarketActivity,
  matchCountLabel
} from '../market-map';

export type MarketMetric = 'searches' | 'matchingResults' | 'exportsPrepared';
const metricNames: Record<MarketMetric, string> = {
  searches: 'Searches',
  matchingResults: 'Matching results',
  exportsPrepared: 'Exports prepared'
};
const format = (n: number) => n.toLocaleString('en-US');
const hasHistory = (state: MarketMetrics) =>
  state.searches > 0 || state.exportsRequested > 0 || state.exportsPrepared > 0;

function quantity(value: number, single: string, plural: string) {
  return format(value) + ' ' + (value === 1 ? single : plural);
}

export function MarketMap({
  data,
  metric,
  onResearch
}: {
  data: MarketActivitySummary;
  metric: MarketMetric;
  onResearch?: (locale: string) => void;
}) {
  const projection = useMemo(() => projectMarketActivity(data), [data]);
  const [selected, setSelected] = useState('');
  const id = useId().replace(/:/g, '');
  const active = projection.states.find((state) => state.code === selected);
  const max = Math.max(0, ...projection.states.map((state) => state[metric]));
  const unknown = (state: MarketMetrics) =>
    metric === 'matchingResults' &&
    hasHistory(state) &&
    (state.searches === 0 || state.unknownResultCounts === state.searches);
  const fill = (state: (typeof projection.states)[number]) => {
    if (!hasHistory(state)) return 'var(--color-background-muted)';
    if (unknown(state)) return `url(#${id}-unknown)`;
    return state[metric] === 0 ? 'var(--color-on-accent)' : 'var(--color-accent)';
  };
  const label = (state: (typeof projection.states)[number]) =>
    `${state.name}: ${!hasHistory(state) ? 'No saved history' : metric === 'matchingResults' ? matchCountLabel(state) : `${format(state[metric])} ${metricNames[metric].toLowerCase()}`}`;
  const renderLocale = (locale: MarketLocale) => (
    <ListItem
      key={locale.locale}
      label={
        <VStack gap={1} className="min-w-0 w-full">
          <HStack justify="between" gap={2} align="center" wrap="wrap">
            <Heading level={4}>{locale.locale}</Heading>
            {onResearch && /^(?:[A-Za-z .'-]+, )?[A-Z]{2}$/.test(locale.locale) && (
              <Button
                size="sm"
                variant="ghost"
                label={`Research ${locale.locale}`}
                onClick={() => onResearch(locale.locale)}
              />
            )}
          </HStack>
          <Grid columns={1} gap={1} className="md:grid-cols-3">
            <Text>{quantity(locale.searches, 'search', 'searches')}</Text>
            <Text>{matchCountLabel(locale)}</Text>
            <Text>{quantity(locale.exportsPrepared, 'export', 'exports')} prepared</Text>
          </Grid>
          <Disclosure trigger="Source quality and dates">
            <Text color="secondary">
              {format(locale.exportsRequested)} export requests ·{' '}
              {format(locale.unknownResultCounts)} unknown result counts ·{' '}
              {format(locale.incompleteSearches)} searches flagged incomplete
            </Text>
            <Text color="secondary">
              Source snapshot: {locale.sourceFetchedAt || 'not recorded'} · Latest saved search:{' '}
              {locale.latestSearchAt
                ? new Date(locale.latestSearchAt).toLocaleDateString('en-US')
                : 'not recorded'}
            </Text>
          </Disclosure>
        </VStack>
      }
    />
  );
  return (
    <VStack gap={3} className="min-w-0 w-full">
      <Grid columns={1} gap={3} className="lg:grid-cols-2 items-start">
        <Section padding={3} variant="muted" className="min-w-0 !m-0">
          <VStack gap={2}>
            <Text weight="semibold">{metricNames[metric]} by state</Text>
            {!projection.states.some(hasHistory) && (
              <Banner
                status="info"
                title="No state-level history yet"
                description="Nationwide, radius and unrecognized locations appear below."
              />
            )}
            <svg
              viewBox={MARKET_MAP_VIEWBOX}
              width="100%"
              className="block w-full h-auto"
              aria-label={`United States market activity by ${metricNames[metric].toLowerCase()}. Alaska and Hawaii are shown as insets. Use Explore a state for keyboard selection.`}
              role="group"
            >
              <defs>
                <pattern id={`${id}-unknown`} width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill="var(--color-accent-muted)" />
                  <path
                    d="M-1 1L1-1M0 6L6 0M5 7L7 5"
                    stroke="var(--color-text-secondary)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              {MARKET_STATES.map((geometry) => {
                const state = projection.states.find((entry) => entry.code === geometry.code)!;
                return (
                  <g key={state.code}>
                    <path
                      d={geometry.path}
                      fill={fill(state)}
                      fillOpacity={
                        hasHistory(state) && state[metric] > 0 && !unknown(state)
                          ? 0.25 + (0.75 * state[metric]) / Math.max(1, max)
                          : 1
                      }
                      stroke="var(--color-text-secondary)"
                      strokeWidth={0.6}
                      vectorEffect="non-scaling-stroke"
                      role="button"
                      tabIndex={-1}
                      aria-label={label(state)}
                      aria-pressed={selected === state.code}
                      onClick={() => setSelected(state.code)}
                    >
                      <title>{label(state)}</title>
                    </path>
                    {selected === state.code && (
                      <path
                        d={geometry.path}
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            <Selector
              label="Explore a state"
              placeholder="Select a state"
              value={selected}
              onChange={setSelected}
              hasSearch
              presentation="adaptive"
              width="100%"
              options={[...projection.states]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((state) => ({
                  value: state.code,
                  label: state.name,
                  description: label(state).slice(state.name.length + 2)
                }))}
            />

            <HStack gap={2} wrap="wrap" aria-label="Map legend">
              <svg width="64" height="12" aria-hidden="true">
                <defs>
                  <linearGradient id={`${id}-scale`}>
                    <stop stopColor="var(--color-accent)" stopOpacity=".25" />
                    <stop offset="1" stopColor="var(--color-accent)" />
                  </linearGradient>
                </defs>
                <rect width="64" height="12" fill={`url(#${id}-scale)`} />
              </svg>
              <Text color="secondary">
                {max > 1
                  ? `Blue intensity: 1–${format(max)} ${metricNames[metric].toLowerCase()}.`
                  : max === 1
                    ? `Blue: 1 ${metricNames[metric].toLowerCase()}.`
                    : 'No positive values for this metric.'}
              </Text>
              <HStack gap={1}>
                <svg width="14" height="14" aria-hidden="true">
                  <rect
                    x="1"
                    y="1"
                    width="12"
                    height="12"
                    fill="var(--color-on-accent)"
                    stroke="var(--color-text-secondary)"
                  />
                </svg>
                <Text color="secondary">Known zero</Text>
              </HStack>
              <HStack gap={1}>
                <svg width="14" height="14" aria-hidden="true">
                  <rect x="1" y="1" width="12" height="12" fill={`url(#${id}-unknown)`} />
                </svg>
                <Text color="secondary">Unknown count</Text>
              </HStack>
              <HStack gap={1}>
                <svg width="14" height="14" aria-hidden="true">
                  <rect
                    x="1"
                    y="1"
                    width="12"
                    height="12"
                    fill="var(--color-background-muted)"
                    stroke="var(--color-text-secondary)"
                  />
                </svg>
                <Text color="secondary">No history</Text>
              </HStack>
            </HStack>
          </VStack>
        </Section>
        <Section
          padding={3}
          dividers={['top']}
          className="min-w-0 !m-0"
          aria-label="State activity"
          aria-live="polite"
        >
          <VStack gap={2}>
            {active ? (
              <>
                <Heading level={3}>{active.name}</Heading>
                {hasHistory(active) ? (
                  <>
                    <Grid columns={1} gap={2} className="md:grid-cols-3">
                      <Text weight="semibold">
                        {quantity(active.searches, 'search', 'searches')}
                      </Text>
                      <Text weight="semibold">{matchCountLabel(active)}</Text>
                      <Text weight="semibold">
                        {quantity(active.exportsPrepared, 'export', 'exports')} prepared
                      </Text>
                    </Grid>
                    <Text color="secondary">
                      Saved search counts are added together; repeat candidates may appear more than
                      once.
                    </Text>
                    <Heading level={4}>Contributing locations</Heading>
                    <List aria-label={`${active.name} contributing locations`}>
                      {[...active.locales]
                        .sort((a, b) => b[metric] - a[metric] || a.locale.localeCompare(b.locale))
                        .map(renderLocale)}
                    </List>
                  </>
                ) : (
                  <Text color="secondary">
                    No saved history for this state. This does not mean there are no candidates or
                    hiring opportunities.
                  </Text>
                )}
              </>
            ) : (
              <>
                <Heading level={3}>Explore your sourcing footprint</Heading>
                <Text color="secondary">
                  Select a state to compare searches, reported matches and prepared exports, then
                  explore its contributing locations.
                </Text>
              </>
            )}
          </VStack>
        </Section>
      </Grid>
      <Section
        padding={3}
        dividers={['top']}
        className="min-w-0 !m-0"
        aria-label="Activity outside state map"
      >
        <VStack gap={2}>
          <Heading level={3}>Outside the state map</Heading>
          <Text color="secondary">
            Nationwide, radius and unrecognized locations stay separate so no activity is assigned
            to the wrong state.
          </Text>
          {projection.unmapped.length ? (
            <List aria-label="Locations outside state map">
              {[...projection.unmapped]
                .sort((a, b) => b[metric] - a[metric] || a.locale.localeCompare(b.locale))
                .map(renderLocale)}
            </List>
          ) : (
            <Text color="secondary">All saved locations are represented on the map.</Text>
          )}
        </VStack>
      </Section>
    </VStack>
  );
}
