import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageRoot = process.cwd();
const contentRoot = path.join(packageRoot, 'content');
const papersContentDir = path.join(contentRoot, 'papers');
const experimentsContentDir = path.join(contentRoot, 'experiments');
const researchDiscoveryExclusionsPath = path.join(
	contentRoot,
	'RESEARCH_DISCOVERY_EXCLUSIONS.json'
);
const papersRoutesDir = path.join(packageRoot, 'src/routes/papers');
const experimentsRoutesDir = path.join(packageRoot, 'src/routes/experiments');
const fileBasedPapersPath = path.join(packageRoot, 'src/lib/config/fileBasedPapers.ts');
const fileBasedExperimentsPath = path.join(packageRoot, 'src/lib/config/fileBasedExperiments.ts');

const allowedDifficulties = new Set(['beginner', 'intermediate', 'advanced']);
const allowedExclusionSurfaces = new Set(['paper', 'experiment']);
const allowedPaperCategories = new Set(['research', 'case-study', 'methodology']);
const requiredFrontmatter = [
	'title',
	'category',
	'keywords',
	'publishedAt',
	'readingTime',
	'difficulty',
	'published'
];
const requiredStaticMetaStringFields = [
	'slug',
	'title',
	'subtitle',
	'description',
	'category',
	'difficulty',
	'date'
];

const failures = [];
const validatedStaticMetaFiles = new Set();

function addFailure(message) {
	failures.push(message);
}

function listFiles(dir, predicate = () => true) {
	if (!fs.existsSync(dir)) return [];

	return fs
		.readdirSync(dir, { withFileTypes: true })
		.flatMap((entry) => {
			const fullPath = path.join(dir, entry.name);
			return entry.isDirectory() ? listFiles(fullPath, predicate) : fullPath;
		})
		.filter(predicate)
		.sort();
}

function readText(filePath) {
	return fs.readFileSync(filePath, 'utf8');
}

function slugFromMarkdownPath(filePath) {
	return path.basename(filePath, '.md');
}

function parseFrontmatter(filePath) {
	const raw = readText(filePath);
	const trimmed = raw.trimStart();
	if (!trimmed.startsWith('---')) {
		return null;
	}

	const endIndex = trimmed.indexOf('\n---', 3);
	if (endIndex === -1) {
		return null;
	}

	const block = trimmed.slice(3, endIndex).trim();
	const keys = new Set();
	const values = new Map();

	for (const line of block.split(/\r?\n/)) {
		const match = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
		if (!match) continue;
		const [, key, rawValue] = match;
		keys.add(key);
		values.set(key, rawValue.trim().replace(/^['"]|['"]$/g, ''));
	}

	return { keys, values };
}

function parseBoolean(value) {
	if (value === 'true') return true;
	if (value === 'false') return false;
	return null;
}

function validateMarkdownFrontmatter(filePath, { summaryField = 'abstract' } = {}) {
	const relativePath = path.relative(packageRoot, filePath);
	const frontmatter = parseFrontmatter(filePath);

	if (!frontmatter) {
		addFailure(`${relativePath}: missing YAML frontmatter`);
		return null;
	}

	for (const key of requiredFrontmatter) {
		if (!frontmatter.keys.has(key)) {
			addFailure(`${relativePath}: missing frontmatter field "${key}"`);
		}
	}

	if (summaryField === 'abstract' && !frontmatter.keys.has('abstract')) {
		addFailure(`${relativePath}: missing frontmatter field "abstract"`);
	}

	if (
		summaryField === 'abstract-or-description' &&
		!frontmatter.keys.has('abstract') &&
		!frontmatter.keys.has('description')
	) {
		addFailure(`${relativePath}: missing frontmatter field "abstract" or "description"`);
	}

	const published = parseBoolean(frontmatter.values.get('published'));
	if (published === null) {
		addFailure(`${relativePath}: "published" must be true or false`);
	}

	const difficulty = frontmatter.values.get('difficulty');
	if (difficulty && !allowedDifficulties.has(difficulty)) {
		addFailure(
			`${relativePath}: difficulty must be one of ${[...allowedDifficulties].join(', ')}`
		);
	}

	const readingTime = Number(frontmatter.values.get('readingTime'));
	if (!Number.isInteger(readingTime) || readingTime <= 0) {
		addFailure(`${relativePath}: readingTime must be a positive integer`);
	}

	const publishedAt = frontmatter.values.get('publishedAt');
	if (publishedAt && Number.isNaN(Date.parse(publishedAt))) {
		addFailure(`${relativePath}: publishedAt is not a valid date`);
	}

	return {
		published,
		frontmatter
	};
}

function extractConfigSlugs(filePath) {
	if (!fs.existsSync(filePath)) return new Set();

	const source = readText(filePath);
	return new Set([...source.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
}

function extractStringProperty(source, property) {
	const regex = new RegExp(
		`\\b${property}:\\s*(?:\\r?\\n\\s*)?(['"])((?:\\\\.|(?!\\1)[\\s\\S])*)\\1`
	);
	const match = regex.exec(source);
	return match?.[2]?.trim() ?? null;
}

function extractNumberProperty(source, property) {
	const regex = new RegExp(`\\b${property}:\\s*(\\d+)`);
	const match = regex.exec(source);
	return match ? Number(match[1]) : null;
}

function extractKeywords(source) {
	const match = /\bkeywords:\s*\[([\s\S]*?)\]/.exec(source);
	if (!match) return null;

	return [...match[1].matchAll(/(['"])((?:\\.|(?!\1)[\s\S])*)\1/g)]
		.map((keywordMatch) => keywordMatch[2].trim())
		.filter(Boolean);
}

function getStaticRouteSlugs(routesDir) {
	return new Set(
		fs
			.readdirSync(routesDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
			.filter((entry) => fs.existsSync(path.join(routesDir, entry.name, '+page.svelte')))
			.map((entry) => entry.name)
	);
}

function getResearchDiscoveryExclusions(surface) {
	if (!fs.existsSync(researchDiscoveryExclusionsPath)) return new Map();

	try {
		const entries = JSON.parse(readText(researchDiscoveryExclusionsPath));
		if (!Array.isArray(entries)) {
			addFailure('content/RESEARCH_DISCOVERY_EXCLUSIONS.json: root value must be an array');
			return new Map();
		}

		const exclusions = new Map();
		for (const [index, entry] of entries.entries()) {
			const prefix = `content/RESEARCH_DISCOVERY_EXCLUSIONS.json[${index}]`;
			if (!entry || typeof entry !== 'object') {
				addFailure(`${prefix}: entry must be an object`);
				continue;
			}

			if (!allowedExclusionSurfaces.has(entry.surface)) {
				addFailure(`${prefix}: surface must be one of paper, experiment`);
			}

			if (typeof entry.slug !== 'string' || entry.slug.trim() === '') {
				addFailure(`${prefix}: missing slug`);
				continue;
			}

			if (typeof entry.reason !== 'string' || entry.reason.trim().length < 20) {
				addFailure(`${prefix}: reason must explain why the route is excluded`);
			}

			if (entry.surface !== surface) continue;

			if (exclusions.has(entry.slug)) {
				addFailure(`${prefix}: duplicate exclusion for "${entry.slug}"`);
			}

			exclusions.set(entry.slug, entry.reason);
		}

		return exclusions;
	} catch (error) {
		addFailure(
			`content/RESEARCH_DISCOVERY_EXCLUSIONS.json: invalid JSON (${error.message})`
		);
		return new Map();
	}
}

function validateStaticMetaFile(filePath, surface) {
	if (validatedStaticMetaFiles.has(filePath)) return;
	validatedStaticMetaFiles.add(filePath);

	const relativePath = path.relative(packageRoot, filePath);
	const source = readText(filePath);

	for (const field of requiredStaticMetaStringFields) {
		if (!extractStringProperty(source, field)) {
			addFailure(`${relativePath}: missing or empty meta.${field}`);
		}
	}

	const category = extractStringProperty(source, 'category');
	if (surface === 'paper' && category && !allowedPaperCategories.has(category)) {
		addFailure(
			`${relativePath}: meta.category must be one of ${[...allowedPaperCategories].join(', ')}`
		);
	}

	const difficulty = extractStringProperty(source, 'difficulty');
	if (difficulty && !allowedDifficulties.has(difficulty)) {
		addFailure(
			`${relativePath}: meta.difficulty must be one of ${[...allowedDifficulties].join(', ')}`
		);
	}

	const readingTime = extractNumberProperty(source, 'readingTime');
	if (!Number.isInteger(readingTime) || readingTime <= 0) {
		addFailure(`${relativePath}: meta.readingTime must be a positive integer`);
	}

	const date = extractStringProperty(source, 'date');
	if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		addFailure(`${relativePath}: meta.date must use YYYY-MM-DD format`);
	}
	if (date && Number.isNaN(Date.parse(date))) {
		addFailure(`${relativePath}: meta.date is not a valid date`);
	}

	const description = extractStringProperty(source, 'description');
	if (description && description.length < 40) {
		addFailure(`${relativePath}: meta.description must be descriptive enough for discovery`);
	}

	const keywords = extractKeywords(source);
	if (!keywords || keywords.length < 3) {
		addFailure(`${relativePath}: meta.keywords must include at least three keywords`);
	}
}

function getStaticRouteMetaSlugs(routesDir, surface) {
	const metaFiles = listFiles(routesDir, (filePath) => filePath.endsWith('/meta.ts'));
	const slugs = new Set();

	for (const filePath of metaFiles) {
		validateStaticMetaFile(filePath, surface);

		const routeSlug = path.basename(path.dirname(filePath));
		const source = readText(filePath);
		const match = /slug:\s*['"]([^'"]+)['"]/.exec(source);

		if (!match) {
			addFailure(`${path.relative(packageRoot, filePath)}: missing meta.slug`);
			continue;
		}

		const metaSlug = match[1];
		if (metaSlug !== routeSlug) {
			addFailure(
				`${path.relative(packageRoot, filePath)}: meta.slug "${metaSlug}" must match route "${routeSlug}"`
			);
		}

		slugs.add(metaSlug);
	}

	return slugs;
}

function getStaticPaperMetaSlugs() {
	return getStaticRouteMetaSlugs(papersRoutesDir, 'paper');
}

function validateStaticRouteCoverage({
	surface,
	routesDir,
	configPath,
	configName,
	routePrefix
}) {
	const fileBasedSlugs = extractConfigSlugs(configPath);
	const staticMetaSlugs = getStaticRouteMetaSlugs(routesDir, surface);
	const staticRouteSlugs = getStaticRouteSlugs(routesDir);
	const exclusions = getResearchDiscoveryExclusions(surface);

	for (const slug of staticRouteSlugs) {
		if (fileBasedSlugs.has(slug) || staticMetaSlugs.has(slug)) continue;

		if (!exclusions.has(slug)) {
			addFailure(
				`${routePrefix}/${slug}/+page.svelte: static ${surface} route must have meta.ts, be listed in ${configName}, or be documented in RESEARCH_DISCOVERY_EXCLUSIONS.json`
			);
		}
	}

	for (const slug of exclusions.keys()) {
		if (!staticRouteSlugs.has(slug)) {
			addFailure(
				`content/RESEARCH_DISCOVERY_EXCLUSIONS.json: "${slug}" does not match a static ${surface} route`
			);
		}

		if (fileBasedSlugs.has(slug) || staticMetaSlugs.has(slug)) {
			addFailure(
				`content/RESEARCH_DISCOVERY_EXCLUSIONS.json: "${slug}" is already represented in public discovery`
			);
		}
	}
}

function validatePublishedPaperCoverage() {
	const fileBasedPaperSlugs = extractConfigSlugs(fileBasedPapersPath);
	const staticPaperMetaSlugs = getStaticPaperMetaSlugs();
	const markdownFiles = listFiles(papersContentDir, (filePath) => filePath.endsWith('.md'));

	for (const filePath of markdownFiles) {
		const slug = slugFromMarkdownPath(filePath);
		const result = validateMarkdownFrontmatter(filePath);
		if (!result?.published) continue;

		if (!fileBasedPaperSlugs.has(slug) && !staticPaperMetaSlugs.has(slug)) {
			addFailure(
				`${path.relative(
					packageRoot,
					filePath
				)}: published paper markdown must be listed in fileBasedPapers.ts or have route meta.ts`
			);
		}
	}
}

function validatePublishedExperimentCoverage() {
	const fileBasedExperimentSlugs = extractConfigSlugs(fileBasedExperimentsPath);
	const markdownFiles = listFiles(
		experimentsContentDir,
		(filePath) => filePath.endsWith('.md') && path.basename(filePath) !== 'README.md'
	);

	for (const filePath of markdownFiles) {
		const slug = slugFromMarkdownPath(filePath);
		const result = validateMarkdownFrontmatter(filePath, {
			summaryField: 'abstract-or-description'
		});
		if (!result?.published) continue;

		if (!fileBasedExperimentSlugs.has(slug)) {
			addFailure(
				`${path.relative(
					packageRoot,
					filePath
				)}: published experiment markdown must be listed in fileBasedExperiments.ts`
			);
		}
	}
}

validateStaticRouteCoverage({
	surface: 'paper',
	routesDir: papersRoutesDir,
	configPath: fileBasedPapersPath,
	configName: 'fileBasedPapers.ts',
	routePrefix: 'src/routes/papers'
});
validateStaticRouteCoverage({
	surface: 'experiment',
	routesDir: experimentsRoutesDir,
	configPath: fileBasedExperimentsPath,
	configName: 'fileBasedExperiments.ts',
	routePrefix: 'src/routes/experiments'
});
validatePublishedPaperCoverage();
validatePublishedExperimentCoverage();

if (failures.length > 0) {
	console.error('Research catalog validation failed:');
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log('Research catalog validation passed.');
