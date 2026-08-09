import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const overview = read('packages/space/src/routes/data/nba/+page.svelte');
const clutch = read('packages/space/src/routes/data/nba/clutch/+page.svelte');
const pace = read('packages/space/src/routes/data/nba/pace/+page.svelte');
const overtime = read('packages/space/src/routes/data/nba/overtime/+page.svelte');
const league = read('packages/space/src/routes/data/nba/league-insights/+page.svelte');
const duo = read('packages/space/src/routes/data/nba/duo-synergy/+page.svelte');
const defense = read('packages/space/src/routes/data/nba/defensive-impact/+page.svelte');
const network = read('packages/space/src/routes/data/nba/shot-network/+page.svelte');
const dateNavigation = read('packages/space/src/lib/experiments/nba-live/DateNavigation.svelte');
const analyticsNav = read('packages/space/src/lib/experiments/nba-live/AnalyticsNav.svelte');
const overtimeInsights = read(
  'packages/space/src/lib/experiments/nba-live/OvertimeInsights.svelte'
);
const correlationChart = read(
  'packages/space/src/lib/experiments/nba-live/CorrelationChart.svelte'
);

test('migrates the complete NBA tool cohort under one truthful contract', () => {
  const group = performancePageRegistry.find((entry) => entry.id === 'space-nba-tools');
  assert.equal(group?.status, 'migrated');
  assert.equal(group?.contract?.archetype, 'tool');
  assert.deepEqual(group?.sources, [
    'packages/space/src/routes/data/nba/+page.svelte',
    'packages/space/src/routes/data/nba/clutch/+page.svelte',
    'packages/space/src/routes/data/nba/defensive-impact/+page.svelte',
    'packages/space/src/routes/data/nba/duo-synergy/+page.svelte',
    'packages/space/src/routes/data/nba/league-insights/+page.svelte',
    'packages/space/src/routes/data/nba/overtime/+page.svelte',
    'packages/space/src/routes/data/nba/pace/+page.svelte',
    'packages/space/src/routes/data/nba/shot-network/+page.svelte'
  ]);
});

test('makes the overview workflow and date controls visible in plain language', () => {
  assert.match(overview, /<p class="category">NBA analysis<\/p>/);
  assert.match(overview, /<h1 class="title">Choose a game\. See what the numbers support\.<\/h1>/);
  assert.match(overview, /Pick a date, choose a game, then open an analysis\./);
  assert.match(
    overview,
    /Detailed views appear only when the\s+available play data can support them\./
  );
  assert.match(overview, /<h3 class="about-title">Start here<\/h3>/);
  assert.match(overview, /Scoreboard data can confirm the score and game state\./);
  assert.match(dateNavigation, /<span>Previous<\/span>/);
  assert.match(dateNavigation, /<span>Next<\/span>/);
  assert.match(analyticsNav, /Choose a game and question/);
  assert.match(analyticsNav, /Close-game proxy/);
  assert.match(analyticsNav, /Pace and efficiency/);
  assert.match(analyticsNav, /Whole-game proxy/);

  for (const preserved of [
    'invalidateAll()',
    '<DateNavigation',
    '<GameSelector',
    '<RecentHistory',
    '<GameHighlightCard',
    "slug: 'duo-synergy'",
    "slug: 'defensive-impact'",
    "slug: 'shot-network'",
    '/data/nba/league-insights?date={data.currentDate}'
  ]) {
    assert.ok(overview.includes(preserved), `Overview lost ${preserved}`);
  }
});

test('states the date-wide questions without overstating the available evidence', () => {
  assert.match(clutch, /<h1>Who stood out in close games\?<\/h1>/);
  assert.match(clutch, /whole-game performances/);
  assert.match(clutch, /not a final-two-minute split/);
  assert.doesNotMatch(clutch, /Clutch Gene|Ice in Veins/);
  assert.match(clutch, /How the close-game rating works/);
  assert.match(clutch, /data\.clutchStats\.slice\(0, 10\)/);
  assert.match(clutch, /Show \{data\.clutchStats\.length - 10\} more players/);
  assert.match(clutch, /data\.clutchStats\.slice\(10\)/);
  for (const field of [
    'fieldGoalPercentage',
    'pointsScored',
    'assists',
    'turnovers',
    'possessions'
  ]) {
    assert.ok(clutch.includes(field), `Close-game table lost ${field}`);
  }

  assert.match(pace, /<h1>Who played fast—and did it help\?<\/h1>/);
  assert.match(pace, /points scored per estimated possession/);
  assert.match(pace, /How to read pace and efficiency/);
  assert.match(pace, /Slate average pace/);
  assert.doesNotMatch(pace, />PPP</);

  assert.match(overtime, /<h1>Which overtime games show fatigue signals\?<\/h1>/);
  assert.match(overtime, /rough proxy—not a period-by-period\s+comparison/);
  assert.match(overtime, /What this proxy can—and cannot—show/);
  assert.doesNotMatch(overtime, /Regular vs\. overtime comparison|performance decline/);
  assert.match(overtimeInsights, /Whole-game fatigue proxy/);
  assert.match(overtimeInsights, /not a direct measure of overtime fatigue/);

  for (const source of [clutch, pace, overtime]) {
    assert.match(source, /Choose another date/);
    assert.match(source, /Back to all games/);
  }
});

test('makes the league sample date-aware and appropriately cautious', () => {
  assert.match(league, /<h1 class="title">What did this slate reveal\?<\/h1>/);
  assert.match(league, /const dateLabel =/);
  assert.match(league, /timeZone: 'UTC'/);
  assert.match(league, /completed\s+games on \{dateLabel\}/);
  assert.match(league, /Try again/);
  assert.match(league, /Choose another date/);
  assert.match(league, /Average combined score/);
  assert.doesNotMatch(league, /today's NBA games|Ball Movement vs Scoring Efficiency/);
  assert.match(correlationChart, /This is a snapshot, not proof that assists caused scoring/);
  assert.match(correlationChart, /Sample: \{data\.length\} team results/);

  for (const preserved of [
    '<CorrelationChart',
    'averageScoring',
    'averageAssists',
    'average3PtAttempts',
    'homeWinPercentage',
    'competitiveBalance.closeGames',
    'competitiveBalance.competitive',
    'competitiveBalance.blowouts'
  ]) {
    assert.ok(league.includes(preserved), `League Insights lost ${preserved}`);
  }
});

test('gives every game-selected analysis a clear recovery and continuation path', () => {
  const cases = [
    [duo, 'Which pairs created efficient possessions?'],
    [defense, 'Which defense changed shot outcomes?'],
    [network, 'Who created shots for whom?']
  ] as const;

  for (const [source, question] of cases) {
    assert.ok(source.includes(question), `${question} is missing`);
    assert.match(source, /Choose a game/);
    assert.match(source, /Try again/);
    assert.match(source, /Choose another analysis/);
    assert.match(source, /href="\/data\/nba\?date=\{data\.date\}"/);
    assert.match(source, /How we calculate this/);
  }

  assert.ok(duo.includes('<DuoChart'));
  assert.ok(defense.includes('<DefensiveHeatmap'));
  assert.ok(network.includes('<ShotNetwork'));
});

function read(path: string) {
  return readFileSync(resolve(workspaceRoot, path), 'utf8');
}
