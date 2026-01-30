/**
 * Airtable Primary Tag Assignment Agent
 *
 * Reads assets missing primary tags from an Airtable view, determines the best
 * primary tag based on Category Groups and asset names, then updates the
 * Tags (Primary) field with the appropriate linked record.
 *
 * Usage:
 *   npx tsx scripts/airtable-tag-agent.ts --dry-run
 *   npx tsx scripts/airtable-tag-agent.ts --limit 10
 *   npx tsx scripts/airtable-tag-agent.ts
 */

// Configuration
const CONFIG = {
	BASE_ID: 'appMoIgXMTTTNIc3p',
	ASSETS_TABLE_ID: 'tblRwzpWoLgE9MrUm',
	TAGS_TABLE_ID: 'tblSygBX7adZ4VNjK', // Will be determined from schema
	VIEW_ID: 'viwr3EAd7A97upSMr', // View filtered for missing primary tags
	PRIMARY_TAG_FIELD_ID: 'fldOERCPutLT9ihWX',
	// API rate limiting
	REQUEST_DELAY_MS: 200,
	BATCH_SIZE: 10, // Records to update in a batch
	PROGRESS_LOG_INTERVAL: 100
};

// Category Group to Tag mapping
// When multiple tags are possible, they're ordered by preference
const CATEGORY_TO_TAG_MAP: Record<string, string[]> = {
	'Food & Drink': ['Restaurant', 'Food', 'Cafe', 'Bar', 'Coffee Shop', 'Winery', 'Food & Drink'],
	'Portfolio & Agency': ['Agency', 'Portfolio', 'Creative', 'Design'],
	'Blog & Editorial': ['Blog', 'Magazine', 'News', 'Newsletter'],
	Education: ['Education', 'School', 'College', 'University', 'Learning'],
	'Professional Services': ['Business', 'Consulting', 'Corporate', 'Law Firm'],
	'Documentation & Help Center': ['Documentation', 'Help center'],
	'Architecture & Design': ['Architecture', 'Interior design', 'Design'],
	'Real Estate & Property Management': ['Real Estate'],
	Environment: ['Nonprofit', 'Charity'],
	'Retail & E-Commerce': ['Retail', 'Shop', 'Marketplace'],
	'Health & Wellness': ['Health', 'Wellness', 'Medical', 'Spa', 'Fitness', 'Beauty & Wellness'],
	Technology: ['Technology', 'Software', 'SaaS', 'App'],
	// Additional mappings from observed data
	Entertainment: ['Entertainment', 'Music', 'Event', 'Game'],
	'Photography & Video': ['Photography', 'Video', 'Photography & Video'],
	'Travel & Tourism': ['Travel', 'Tourism', 'Hotel', 'Hostel'],
	'Finance & Banking': ['Finance', 'Bank', 'Investment', 'Insurance'],
	'Sports & Fitness': ['Sports', 'Fitness', 'Gym', 'sport'],
	'Non-Profit & Charity': ['Nonprofit', 'Charity', 'Donation'],
	'Resume & Personal': ['Resume', 'Personal', 'CV', 'Profile'],
	'Coming Soon & Launch': ['Coming Soon', 'Landing page', 'Under Construction'],
	// More observed category groups
	'Hair & Beauty': ['Beauty', 'Salon', 'Barber', 'Spa'],
	'Community & Nonprofit': ['Nonprofit', 'Charity', 'Church'],
	'Home Services': ['Construction', 'Interior design', 'Real Estate'],
	Government: ['Business', 'Corporate', 'Nonprofit'],
	Medical: ['Medical', 'Doctor', 'Health', 'Dentist', 'Hospital'],
	Wellness: ['Wellness', 'Health', 'Spa', 'Fitness'],
	Documentation: ['Documentation', 'Help center'],
	'Real Estate': ['Real Estate'],
	// More specific categories that might appear
	Automotive: ['Automotive', 'Cars'],
	'Pets & Animals': ['Pets', 'Veterinary'],
	'Legal & Law': ['Law Firm', 'Attorney', 'Business'],
	Religious: ['Church', 'Religion'],
	Wedding: ['Wedding', 'Event'],
	Sports: ['Sports', 'Fitness', 'sport'],
	Fashion: ['Fashion', 'Retail', 'Shop'],
	Music: ['Music', 'Musician', 'Band', 'Entertainment'],
	Gaming: ['Game', 'Entertainment'],
	Crypto: ['Finance', 'Technology'],
	NFT: ['Technology', 'Creative', 'Marketplace']
};

// Types
interface AirtableRecord {
	id: string;
	fields: Record<string, unknown>;
}

interface AirtableResponse {
	records: AirtableRecord[];
	offset?: string;
}

interface Tag {
	id: string;
	name: string;
}

interface Asset {
	id: string;
	name: string;
	categoryGroups: string[];
}

interface TagAssignment {
	assetId: string;
	assetName: string;
	categoryGroups: string[];
	assignedTag: string;
	tagId: string;
	reason: string;
}

// Parse CLI arguments
function parseArgs(): { dryRun: boolean; limit: number | null; verbose: boolean } {
	const args = process.argv.slice(2);
	return {
		dryRun: args.includes('--dry-run'),
		limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null,
		verbose: args.includes('--verbose') || args.includes('-v')
	};
}

// Get API key from environment
function getApiKey(): string {
	const pat = process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;

	if (!pat) {
		throw new Error(
			'AIRTABLE_PAT or AIRTABLE_API_KEY environment variable is required.\n' +
				'Set it with: export AIRTABLE_PAT="pat..."'
		);
	}
	return pat;
}

// Sleep utility for rate limiting
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch all records from a table with pagination
async function fetchAllRecords(
	tableId: string,
	fields: string[],
	viewId?: string
): Promise<AirtableRecord[]> {
	const apiKey = getApiKey();
	const allRecords: AirtableRecord[] = [];
	let offset: string | undefined;

	do {
		const params = new URLSearchParams();
		if (viewId) params.set('view', viewId);
		fields.forEach((field) => params.append('fields[]', field));
		if (offset) params.set('offset', offset);

		const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${encodeURIComponent(tableId)}?${params.toString()}`;

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Airtable API error: ${response.status} - ${error}`);
		}

		const data: AirtableResponse = await response.json();
		allRecords.push(...data.records);
		offset = data.offset;

		// Rate limiting
		await sleep(CONFIG.REQUEST_DELAY_MS);
	} while (offset);

	return allRecords;
}

// Fetch all tags and build name -> ID map
async function fetchAllTags(): Promise<Map<string, Tag>> {
	console.log('📚 Fetching all tags from Tags table...');

	// First, we need to find the Tags table ID by looking at the schema
	// Based on the existing code, the Tags table is referenced in the Assets table
	// We'll fetch from the linked records field

	// The Tags table appears to be 'tblSygBX7adZ4VNjK' based on the landing-page-filter code
	// But let's use the table name approach which is more reliable

	const records = await fetchAllRecords('🏷️Tags', ['Name']);

	const tagMap = new Map<string, Tag>();

	for (const record of records) {
		const name = record.fields['Name'] as string;
		if (name) {
			tagMap.set(name.toLowerCase(), {
				id: record.id,
				name
			});
		}
	}

	console.log(`✅ Loaded ${tagMap.size} tags`);
	return tagMap;
}

// Fetch assets missing primary tags from the filtered view
async function fetchAssetsMissingTags(limit?: number | null): Promise<Asset[]> {
	console.log('📋 Fetching assets missing primary tags...');

	const records = await fetchAllRecords(
		CONFIG.ASSETS_TABLE_ID,
		['Name', '🪣Category Group(s) Display Name'],
		CONFIG.VIEW_ID
	);

	let assets = records.map((record) => ({
		id: record.id,
		name: (record.fields['Name'] as string) || '',
		categoryGroups: (record.fields['🪣Category Group(s) Display Name'] as string[]) || []
	}));

	if (limit && limit > 0) {
		assets = assets.slice(0, limit);
	}

	console.log(`✅ Found ${assets.length} assets missing primary tags`);
	return assets;
}

// Determine the best primary tag for an asset
function determinePrimaryTag(
	asset: Asset,
	tagMap: Map<string, Tag>
): { tag: Tag; reason: string } | null {
	const { name, categoryGroups } = asset;

	// Filter out null/undefined categories
	const validCategories = categoryGroups.filter((c) => c != null && typeof c === 'string');

	// Strategy 1: Exact match - check if any category group exactly matches a tag
	for (const category of validCategories) {
		const exactMatch = tagMap.get(category.toLowerCase());
		if (exactMatch) {
			return { tag: exactMatch, reason: `Exact match with category "${category}"` };
		}
	}

	// Strategy 2: Use mapping table
	for (const category of validCategories) {
		const mappedTags = CATEGORY_TO_TAG_MAP[category];
		if (mappedTags) {
			for (const tagName of mappedTags) {
				const tag = tagMap.get(tagName.toLowerCase());
				if (tag) {
					return { tag, reason: `Mapped from category "${category}" to "${tag.name}"` };
				}
			}
		}
	}

	// Strategy 3: Name-based inference - look for keywords in asset name
	const nameLower = name.toLowerCase();
	const nameKeywords: Record<string, string[]> = {
		restaurant: ['Restaurant', 'Food', 'Cafe'],
		cafe: ['Cafe', 'Coffee Shop', 'Food'],
		coffee: ['Coffee Shop', 'Cafe'],
		hotel: ['Hotel', 'Travel'],
		hostel: ['Hostel', 'Travel'],
		portfolio: ['Portfolio', 'Creative'],
		agency: ['Agency', 'Creative'],
		blog: ['Blog', 'Magazine'],
		shop: ['Shop', 'Retail', 'E-Commerce'],
		store: ['Shop', 'Retail', 'E-Commerce'],
		ecommerce: ['Retail', 'Shop', 'Marketplace'],
		saas: ['SaaS', 'Software', 'Technology'],
		dashboard: ['Dashboard', 'SaaS', 'App'],
		app: ['App', 'Software', 'Technology'],
		startup: ['Startup', 'Business', 'Technology'],
		consulting: ['Consulting', 'Business'],
		law: ['Law Firm', 'Attorney'],
		lawyer: ['Law Firm', 'Attorney'],
		medical: ['Medical', 'Health', 'Doctor'],
		health: ['Health', 'Medical', 'Wellness'],
		fitness: ['Fitness', 'Gym', 'Sports'],
		gym: ['Gym', 'Fitness', 'Sports'],
		real: ['Real Estate'],
		estate: ['Real Estate'],
		property: ['Real Estate'],
		education: ['Education', 'School', 'Learning'],
		school: ['School', 'Education'],
		university: ['University', 'Education', 'College'],
		photography: ['Photography', 'Photography & Video'],
		photographer: ['Photography', 'Photography & Video'],
		video: ['Video', 'Photography & Video'],
		wedding: ['Wedding', 'Event'],
		event: ['Event', 'Conference'],
		music: ['Music', 'Musician', 'Band'],
		podcast: ['Podcast', 'Music', 'Entertainment'],
		resume: ['Resume', 'CV', 'Personal'],
		cv: ['CV', 'Resume', 'Personal'],
		personal: ['Personal', 'Portfolio', 'Profile'],
		nonprofit: ['Nonprofit', 'Charity'],
		charity: ['Charity', 'Nonprofit', 'Donation'],
		church: ['Church', 'Religion'],
		travel: ['Travel', 'Tourism'],
		tourism: ['Tourism', 'Travel'],
		finance: ['Finance', 'Bank', 'Investment'],
		bank: ['Bank', 'Finance'],
		insurance: ['Insurance', 'Finance'],
		construction: ['Construction', 'Architecture'],
		architecture: ['Architecture', 'Interior design'],
		interior: ['Interior design', 'Architecture'],
		design: ['Design', 'Creative', 'Interior design'],
		creative: ['Creative', 'Agency', 'Design'],
		marketing: ['Marketing', 'Agency', 'Business'],
		news: ['News', 'Magazine', 'Blog'],
		magazine: ['Magazine', 'News', 'Blog'],
		technology: ['Technology', 'Software', 'App'],
		tech: ['Technology', 'Software', 'App'],
		software: ['Software', 'Technology', 'SaaS'],
		crypto: ['Finance', 'Technology', 'Investment'],
		nft: ['Technology', 'Creative', 'Marketplace'],
		ai: ['Technology', 'Software', 'SaaS'],
		fashion: ['Fashion', 'Retail', 'Shop'],
		beauty: ['Beauty', 'Salon', 'Spa'],
		salon: ['Salon', 'Beauty', 'Spa'],
		spa: ['Spa', 'Beauty', 'Wellness'],
		barber: ['Barber', 'Salon', 'Beauty'],
		dentist: ['Dentist', 'Medical', 'Health'],
		doctor: ['Doctor', 'Medical', 'Health'],
		veterinary: ['Veterinary', 'Pets', 'Medical'],
		pet: ['Pets', 'Veterinary'],
		automotive: ['Automotive', 'Cars'],
		car: ['Cars', 'Automotive'],
		logistics: ['Logistics', 'Transport'],
		delivery: ['Delivery', 'Logistics', 'Transport'],
		job: ['Job Portal', 'Recruitment'],
		career: ['Job Portal', 'Recruitment'],
		recruitment: ['Recruitment', 'Job Portal']
	};

	for (const [keyword, tagNames] of Object.entries(nameKeywords)) {
		if (nameLower.includes(keyword)) {
			for (const tagName of tagNames) {
				const tag = tagMap.get(tagName.toLowerCase());
				if (tag) {
					return { tag, reason: `Name contains "${keyword}" → "${tag.name}"` };
				}
			}
		}
	}

	// Strategy 4: Fallback - use first category group's first word as tag
	if (validCategories.length > 0) {
		const firstCategory = validCategories[0];
		const firstWord = firstCategory.split(/[&,]/)[0].trim();
		const fallbackTag = tagMap.get(firstWord.toLowerCase());
		if (fallbackTag) {
			return { tag: fallbackTag, reason: `Fallback: first word of category "${firstWord}"` };
		}
	}

	return null;
}

// Update asset with primary tag
async function updateAssetTag(assetId: string, tagId: string): Promise<boolean> {
	const apiKey = getApiKey();

	const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${CONFIG.ASSETS_TABLE_ID}/${assetId}`;

	const response = await fetch(url, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			fields: {
				[CONFIG.PRIMARY_TAG_FIELD_ID]: [tagId]
			}
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error(`❌ Failed to update asset ${assetId}: ${error}`);
		return false;
	}

	return true;
}

// Batch update assets with primary tags
async function batchUpdateAssets(
	assignments: TagAssignment[],
	dryRun: boolean,
	verbose: boolean
): Promise<{ success: number; failed: number }> {
	let success = 0;
	let failed = 0;

	for (let i = 0; i < assignments.length; i++) {
		const assignment = assignments[i];

		if (verbose || (i + 1) % CONFIG.PROGRESS_LOG_INTERVAL === 0) {
			console.log(`📝 [${i + 1}/${assignments.length}] ${assignment.assetName}`);
			console.log(`   Categories: ${assignment.categoryGroups.join(', ') || '(none)'}`);
			console.log(`   → Tag: ${assignment.assignedTag} (${assignment.reason})`);
		}

		if (!dryRun) {
			const result = await updateAssetTag(assignment.assetId, assignment.tagId);
			if (result) {
				success++;
			} else {
				failed++;
			}
			// Rate limiting
			await sleep(CONFIG.REQUEST_DELAY_MS);
		} else {
			success++;
		}
	}

	return { success, failed };
}

// Main execution
async function main() {
	const { dryRun, limit, verbose } = parseArgs();

	console.log('🏷️  Airtable Primary Tag Assignment Agent');
	console.log('=========================================');
	console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE (will update records)'}`);
	if (limit) console.log(`Limit: ${limit} records`);
	console.log('');

	try {
		// Step 1: Fetch all tags
		const tagMap = await fetchAllTags();

		// Step 2: Fetch assets missing tags
		const assets = await fetchAssetsMissingTags(limit);

		if (assets.length === 0) {
			console.log('✅ No assets missing primary tags!');
			return;
		}

		// Step 3: Determine primary tag for each asset
		console.log('\n🔄 Processing assets...');
		const assignments: TagAssignment[] = [];
		const unassigned: Asset[] = [];

		for (const asset of assets) {
			const result = determinePrimaryTag(asset, tagMap);

			if (result) {
				assignments.push({
					assetId: asset.id,
					assetName: asset.name,
					categoryGroups: asset.categoryGroups,
					assignedTag: result.tag.name,
					tagId: result.tag.id,
					reason: result.reason
				});
			} else {
				unassigned.push(asset);
			}
		}

		console.log(`\n📊 Results:`);
		console.log(`   Assigned: ${assignments.length}`);
		console.log(`   Unassigned: ${unassigned.length}`);

		// Show some unassigned for debugging
		if (unassigned.length > 0 && verbose) {
			console.log('\n⚠️  Sample unassigned assets:');
			unassigned.slice(0, 10).forEach((asset) => {
				console.log(`   - ${asset.name} [${asset.categoryGroups.join(', ') || 'no categories'}]`);
			});
		}

		// Step 4: Update assets
		if (assignments.length > 0) {
			console.log(`\n${dryRun ? '🔍 Would update' : '✏️  Updating'} ${assignments.length} assets...`);
			const { success, failed } = await batchUpdateAssets(assignments, dryRun, verbose);

			console.log(`\n✅ Complete!`);
			console.log(`   Success: ${success}`);
			if (failed > 0) console.log(`   Failed: ${failed}`);
		}

		// Summary of tag distribution
		if (verbose) {
			const tagCounts = new Map<string, number>();
			for (const a of assignments) {
				tagCounts.set(a.assignedTag, (tagCounts.get(a.assignedTag) || 0) + 1);
			}

			console.log('\n📈 Tag Distribution:');
			const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
			sorted.slice(0, 20).forEach(([tag, count]) => {
				console.log(`   ${tag}: ${count}`);
			});
		}
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

main();
