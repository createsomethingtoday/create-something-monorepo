/**
 * Benchmark: TypeScript vs WASM implementation
 * 
 * Run: npx tsx benchmark.ts
 */

// Generate test data
function generatePages(count: number) {
	const pages = [];
	for (let i = 0; i < count; i++) {
		// Create some duplicates (every 10th item has same title as previous)
		const titleNum = i % 10 === 0 && i > 0 ? i - 1 : i;
		pages.push({
			id: `page-${i}`,
			title: `Task ${titleNum}`,
			created_time: new Date(2024, 0, 1 + i).toISOString()
		});
	}
	return pages;
}

// TypeScript implementation (from tools.ts)
function findDuplicatesTS(pages: Array<{ id: string; title: string; created_time: string }>, keepStrategy: string) {
	const titleGroups = new Map<string, typeof pages>();
	for (const page of pages) {
		const normalizedTitle = page.title.toLowerCase().trim();
		const existing = titleGroups.get(normalizedTitle) || [];
		existing.push(page);
		titleGroups.set(normalizedTitle, existing);
	}

	const duplicateGroups: Array<{
		title: string;
		keep: { id: string; created_time: string };
		archive: Array<{ id: string; created_time: string }>;
	}> = [];

	for (const [title, group] of titleGroups) {
		if (group.length > 1) {
			group.sort((a, b) => 
				new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
			);
			
			const keepIndex = keepStrategy === 'oldest' ? 0 : group.length - 1;
			const keep = group[keepIndex];
			const archive = group.filter((_, i) => i !== keepIndex);
			
			duplicateGroups.push({ title, keep, archive });
		}
	}

	const pagesToArchive = duplicateGroups.flatMap(g => g.archive.map(p => p.id));

	return {
		total_pages: pages.length,
		duplicate_groups: duplicateGroups.length,
		pages_to_archive: pagesToArchive
	};
}

// Benchmark runner
async function benchmark() {
	const sizes = [100, 500, 1000, 5000];
	
	console.log('Benchmark: find_duplicates - TypeScript vs WASM\n');
	console.log('| Pages | TypeScript | WASM | Speedup |');
	console.log('|-------|------------|------|---------|');
	
	// Import WASM
	const wasm = await import('./pkg/notion_tools.js');
	
	for (const size of sizes) {
		const pages = generatePages(size);
		const pagesJson = JSON.stringify(pages);
		
		// Warm up
		findDuplicatesTS(pages, 'oldest');
		wasm.find_duplicates(pagesJson, 'oldest');
		
		// TypeScript benchmark
		const tsIterations = 100;
		const tsStart = performance.now();
		for (let i = 0; i < tsIterations; i++) {
			findDuplicatesTS(pages, 'oldest');
		}
		const tsTime = (performance.now() - tsStart) / tsIterations;
		
		// WASM benchmark
		const wasmIterations = 100;
		const wasmStart = performance.now();
		for (let i = 0; i < wasmIterations; i++) {
			wasm.find_duplicates(pagesJson, 'oldest');
		}
		const wasmTime = (performance.now() - wasmStart) / wasmIterations;
		
		const speedup = tsTime / wasmTime;
		
		console.log(`| ${size.toString().padEnd(5)} | ${tsTime.toFixed(2).padStart(8)}ms | ${wasmTime.toFixed(2).padStart(4)}ms | ${speedup.toFixed(1).padStart(6)}x |`);
	}
	
	// Verify results match
	const testPages = generatePages(100);
	const tsResult = findDuplicatesTS(testPages, 'oldest');
	const wasmResult = JSON.parse(wasm.find_duplicates(JSON.stringify(testPages), 'oldest'));
	
	console.log('\nVerification:');
	console.log(`  TS duplicates found: ${tsResult.duplicate_groups}`);
	console.log(`  WASM duplicates found: ${wasmResult.duplicate_groups}`);
	console.log(`  Results match: ${tsResult.pages_to_archive.length === wasmResult.pages_to_archive.length ? '✓' : '✗'}`);
}

benchmark().catch(console.error);
