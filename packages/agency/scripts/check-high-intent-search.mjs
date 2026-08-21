#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const campaignPath = resolve(
  packageRoot,
  'content/campaigns/high-intent-google-search-v20260810/campaign-spec.json'
);

export function validateHighIntentSearchCampaign(campaign, options = {}) {
  const root = options.packageRoot ?? packageRoot;
  const errors = [];
  const allowedMatchTypes = new Set(['exact', 'phrase']);
  const expectedCampaignId = 'agency-high-intent-search-v20260810';
  const expectedBudget = 50;

  if (campaign.id !== expectedCampaignId) errors.push(`campaign id must be ${expectedCampaignId}`);
  if (campaign.dailyBudgetUsd !== expectedBudget) errors.push('daily budget must be USD 50');
  if (campaign.activation?.status !== 'approval-required') {
    errors.push('activation must remain approval-required');
  }
  if (campaign.activation?.accountMutationAuthorized !== false) {
    errors.push('Ads account mutation must remain unauthorized');
  }
  if (campaign.activation?.spendAuthorized !== false) {
    errors.push('spend must remain unauthorized');
  }
  if (campaign.activation?.preSpendGate !== 'google-keyword-planner') {
    errors.push('Google Keyword Planner must remain the pre-spend gate');
  }

  const network = campaign.network ?? {};
  if (network.channel !== 'google-search') errors.push('channel must be Google Search');
  for (const field of [
    'searchPartners',
    'displayExpansion',
    'performanceMax',
    'dynamicSearchAds',
    'automaticUrlExpansion'
  ]) {
    if (network[field] !== false) errors.push(`${field} must be false`);
  }
  if (network.presenceOnly !== true) errors.push('location targeting must be presence-only');

  const budgetSum = (campaign.adGroups ?? []).reduce(
    (sum, adGroup) => sum + Number(adGroup.dailyBudgetUsd ?? 0),
    0
  );
  if (budgetSum !== expectedBudget) errors.push(`ad-group budgets sum to USD ${budgetSum}`);

  for (const adGroup of campaign.adGroups ?? []) {
    const routeSource = resolve(root, `src/routes${adGroup.landingPath === '/' ? '' : adGroup.landingPath}/+page.svelte`);
    if (!existsSync(routeSource)) errors.push(`${adGroup.id} landing route does not exist`);
    if (
      adGroup.landingPath !== '/' &&
      existsSync(routeSource) &&
      !/search-policy:\s*noindex/.test(readFileSync(routeSource, 'utf8'))
    ) {
      errors.push(`${adGroup.id} landing route must declare the noindex search policy`);
    }

    for (const keyword of adGroup.keywords ?? []) {
      if (!allowedMatchTypes.has(keyword.matchType)) {
        errors.push(`${adGroup.id} keyword ${keyword.text} uses ${keyword.matchType}`);
      }
    }

    for (const headline of adGroup.ad?.headlines ?? []) {
      if (headline.length > 30) errors.push(`${adGroup.id} headline exceeds 30 characters: ${headline}`);
    }
    for (const description of adGroup.ad?.descriptions ?? []) {
      if (description.length > 90) {
        errors.push(`${adGroup.id} description exceeds 90 characters: ${description}`);
      }
    }

    const finalUrl = new URL(adGroup.finalUrl);
    if (finalUrl.origin !== 'https://createsomething.agency') {
      errors.push(`${adGroup.id} final URL must use createsomething.agency`);
    }
    if (finalUrl.pathname !== adGroup.landingPath) {
      errors.push(`${adGroup.id} final URL does not match its landing path`);
    }
    for (const [key, expected] of [
      ['utm_source', 'google'],
      ['utm_medium', 'cpc'],
      ['utm_campaign', expectedCampaignId],
      ['utm_content', adGroup.id]
    ]) {
      if (finalUrl.searchParams.get(key) !== expected) {
        errors.push(`${adGroup.id} final URL has invalid ${key}`);
      }
    }
    for (const forbidden of ['gclid', 'wbraid', 'gbraid', 'utm_term']) {
      if (finalUrl.searchParams.has(forbidden)) {
        errors.push(`${adGroup.id} final URL must not include ${forbidden}`);
      }
    }
  }

  for (const holdback of campaign.holdbacks ?? []) {
    if (holdback.status !== 'paused') errors.push(`${holdback.cluster} must remain paused`);
  }

  return errors;
}

function main() {
  const campaign = JSON.parse(readFileSync(campaignPath, 'utf8'));
  const errors = validateHighIntentSearchCampaign(campaign);
  if (errors.length > 0) {
    console.error('High-intent Search campaign check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('High-intent Search campaign check passed. Activation remains approval-required.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
