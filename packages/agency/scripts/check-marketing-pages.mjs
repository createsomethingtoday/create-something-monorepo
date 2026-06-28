#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditPublicCopy, healPublicCopy } from './check-public-copy.mjs';
import {
	marketingPageMinimums,
	marketingPagePortfolio,
	scoreMarketingPage
} from '../src/lib/data/marketingPages.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const routesRoot = path.join(packageRoot, 'src/routes');
const searchRoutesPath = path.join(packageRoot, 'src/lib/data/searchRoutes.json');

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const json = args.has('--json');

if (write) {
	const files = marketingPagePortfolio.map((entry) => pageFileForRoute(entry.path)).filter(existsSync);
	healPublicCopy(files);
	syncSearchRoutes();
}

const searchRoutes = readSearchRoutes();
const searchRouteMap = new Map(searchRoutes.map((entry) => [entry.path, entry]));
const errors = [];
const rows = [];

for (const entry of marketingPagePortfolio) {
	const pageFile = pageFileForRoute(entry.path);

	if (!existsSync(pageFile)) {
		errors.push(`${entry.path} is in the marketing portfolio but has no +page.svelte`);
		continue;
	}

	const source = readFileSync(pageFile, 'utf8');
	const copyFindings = auditPublicCopy([pageFile]);
	const score = scoreMarketingPage(entry, source, { plainLanguagePassed: copyFindings.length === 0 });
	const threshold = marketingPageMinimums[entry.decision];
	const searchRoute = searchRouteMap.get(entry.path);

	rows.push({
		path: entry.path,
		cluster: entry.cluster,
		role: entry.role,
		stage: entry.funnelStage,
		decision: entry.decision,
		score: score.percent,
		status: score.status,
		levers: entry.selfHealing.join(', ')
	});

	if (score.percent < threshold) {
		errors.push(
			`${entry.path} scores ${score.percent}, below ${threshold} for decision "${entry.decision}"`
		);

		for (const check of score.checks.filter((check) => !check.passed)) {
			errors.push(`  - ${entry.path} failed ${check.id}: ${check.label}`);
		}
	}

	if (copyFindings.length > 0) {
		for (const finding of copyFindings) {
			errors.push(
				`${finding.file}:${finding.line}:${finding.column} ${finding.rule} "${finding.text}" -> "${finding.replacement}"`
			);
		}
	}

	if (entry.decision === 'index') {
		if (!searchRoute) {
			errors.push(`${entry.path} is marked index but is missing from searchRoutes.json`);
		} else {
			for (const field of ['changefreq', 'priority', 'lastmod']) {
				if (searchRoute[field] !== entry.search[field]) {
					errors.push(
						`${entry.path} searchRoutes.${field} is "${searchRoute[field]}" but portfolio expects "${entry.search[field]}"`
					);
				}
			}
		}
	} else {
		if (!entry.routeTarget) {
			errors.push(`${entry.path} is marked ${entry.decision} but has no routeTarget`);
		}

		if (searchRoute) {
			errors.push(`${entry.path} is marked ${entry.decision} but is still in searchRoutes.json`);
		}

		if (!/noindex=\{true\}/.test(source)) {
			errors.push(`${entry.path} is marked ${entry.decision} but does not pass noindex={true}`);
		}
	}
}

const clusterErrors = validateClusters();
errors.push(...clusterErrors);

if (json) {
	console.log(JSON.stringify({ ok: errors.length === 0, rows, errors }, null, 2));
} else {
	console.log(formatRows(rows));
}

if (errors.length > 0) {
	if (!json) {
		console.error('Marketing page check failed:');
		for (const error of errors) {
			console.error(`- ${error}`);
		}
	}
	process.exit(1);
}

if (!json) {
	console.log(`Marketing page check passed across ${rows.length} page(s).`);
}

function validateClusters() {
	const findings = [];
	const byCluster = new Map();

	for (const entry of marketingPagePortfolio) {
		const cluster = byCluster.get(entry.cluster) ?? [];
		cluster.push(entry);
		byCluster.set(entry.cluster, cluster);
	}

	for (const [cluster, entries] of byCluster.entries()) {
		const pillars = entries.filter((entry) => entry.role === 'pillar');

		if (pillars.length !== 1) {
			findings.push(`${cluster} should have exactly one pillar page, found ${pillars.length}`);
			continue;
		}

		const pillarPath = pillars[0].path;

		for (const entry of entries) {
			if (entry.path === pillarPath) continue;

			const pageFile = pageFileForRoute(entry.path);
			if (!existsSync(pageFile)) continue;

			const source = readFileSync(pageFile, 'utf8');
			if (!source.includes(`"${pillarPath}"`) && !source.includes(`href: '${pillarPath}'`)) {
				findings.push(`${entry.path} should route readers back to pillar ${pillarPath}`);
			}
		}
	}

	return findings;
}

function syncSearchRoutes() {
	const routes = readSearchRoutes();
	const portfolioMap = new Map(marketingPagePortfolio.map((entry) => [entry.path, entry]));
	const next = [];
	const seen = new Set();

	for (const route of routes) {
		const entry = portfolioMap.get(route.path);

		if (!entry) {
			next.push(route);
			continue;
		}

		seen.add(route.path);

		if (entry.decision !== 'index') {
			continue;
		}

		next.push({ path: entry.path, ...entry.search });
	}

	for (const entry of marketingPagePortfolio) {
		if (entry.decision === 'index' && !seen.has(entry.path)) {
			next.push({ path: entry.path, ...entry.search });
		}
	}

	writeFileSync(searchRoutesPath, `${JSON.stringify(next, null, '\t')}\n`);
}

function readSearchRoutes() {
	return JSON.parse(readFileSync(searchRoutesPath, 'utf8'));
}

function pageFileForRoute(route) {
	const routeDir = route === '/' ? routesRoot : path.join(routesRoot, route.slice(1));
	return path.join(routeDir, '+page.svelte');
}

function formatRows(rows) {
	const header = ['Path', 'Role', 'Stage', 'Decision', 'Score', 'Levers'];
	const values = rows.map((row) => [
		row.path,
		row.role,
		row.stage,
		row.decision,
		`${row.score}`,
		row.levers
	]);
	const widths = header.map((label, index) =>
		Math.max(label.length, ...values.map((row) => row[index].length))
	);
	const format = (row) => row.map((value, index) => value.padEnd(widths[index])).join('  ');

	return [format(header), format(widths.map((width) => '-'.repeat(width))), ...values.map(format)].join(
		'\n'
	);
}
