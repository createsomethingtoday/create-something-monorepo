/**
 * Seed script for FNJI Products
 * 
 * Run with:
 *   pnpm --filter @create-something/io exec tsx scripts/seed-fnji-products.ts > seed-fnji.sql
 *   wrangler d1 execute create-something-db --remote --file=seed-fnji.sql
 * 
 * Or for local:
 *   wrangler d1 execute create-something-db --local --file=seed-fnji.sql
 */

interface Product {
	id: string;
	name: string;
	category: 'seating' | 'tables' | 'storage' | 'lighting';
	materials: string[];
	dimensions: { width: number; depth: number; height: number };
	price: number; // cents
	status: 'in_stock' | 'pre_order';
	image_url: string;
}

const products: Product[] = [
	{
		id: 'fnji-001',
		name: 'H-shaped Side Table',
		category: 'tables',
		materials: ['Walnut', 'Brass'],
		dimensions: { width: 80, depth: 45, height: 55 },
		price: 125000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwN-ZP680eDOALwIZrCgOmsTByBuiF8JR5Itd9EzQbll2h9-JBS97thZzays3MzboM469STPK-2aW_ED2hjVNm8aWWQ8vp3OYCfZ0_Y7vz2C_LDeahR6JPUoHxM4NDIVZ0kHdkV3x9CxUFOtC-iL-dHrmhR0SI_JkwEliRJKm2laF6W0RrTOR44jdbV2wOw03XwZYOkm_TR38eW3B_-JjsgNr1rS3CgsaUJdhOtgBFJtyfy_IEeF0eXGUIMZoPDyJaX2sNGWuskYQ'
	},
	{
		id: 'fnji-002',
		name: 'Mantis Chair',
		category: 'seating',
		materials: ['Oak', 'Leather'],
		dimensions: { width: 60, depth: 85, height: 75 },
		price: 188000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbDF4t8XJUP2glAjxS1_cqBhaFAbKmim6sVugCbArdLcE1wWgOmaXHY0iYsnJ--SZvBMx6TIulvxyt8EVy_sg4OldE04h-1lENz_Gs-HmiY_U1aavrUwUEIGhT2tzUKKf9hFv7UmkePGzbMinJTxipbdwdbaFL2BvrJwdxkaVIWR3U_KLL1HffsedUqXC_mPrrZCQPdJr20SrqRoV1Sb3Q3a4QnF_UyxD7C6men2Xd2XQiRcoP5Aq-wRGK_65R29F8F6g0mRvVnzY'
	},
	{
		id: 'fnji-003',
		name: 'Moon Tides Bedside Cabinet',
		category: 'storage',
		materials: ['Walnut', 'Brass'],
		dimensions: { width: 80, depth: 45, height: 55 },
		price: 125000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgvmt5RBnRsaLnT-qvip6ddT7c5A_PmfKZzxhj93Sl4fwvcAI_qLxziKJiNmW3e3Oos526NXLPE_bY4wlT4XPg-ecexvSnz4LUDJ5_m1Y3GJwjxUBDimBXa-qsmNGUon6MWupnvLmzdBPlhr3r6UoTWRK_9Of1QaBOCNjltABz1jaAoRNeEWiAGaoZhJ0uWXDfyguVjYwXfevcWAn7Rb44E815069SgmjkcDK4RSoba4itDYDJ-hs_GccW2Wsz2-sVg4GBP5DeCG8'
	},
	{
		id: 'fnji-004',
		name: 'Low Coffee Table',
		category: 'tables',
		materials: ['Walnut', 'Brass'],
		dimensions: { width: 120, depth: 60, height: 40 },
		price: 145000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3oQm7nC8JUF4gu-C4XKEvWGsp-uNGrMh5VIF2Xjq0ADYyU3MxMAUsrtpHtuYr7ok_yHgffwz6rHPb_KF6G-QOhzOR-7kR4Fqa9pP3U5Z-e2KdjNG9Rl8gNqv_r28OxSRxjudgzNVyjh6zFwmaV0qdY_3ZvGFInMN3I4uBb5z1FiqQEbTkVVuXeCWXrYufaciLZogze0cW7VJKBmSyjuTB_smYoKj8qWS2ivaV5keh1ZIkWPD9lCUBaMrosuISgY8PK6vlofkiM7s'
	},
	{
		id: 'fnji-005',
		name: 'Mantis Chair Compact',
		category: 'seating',
		materials: ['Oak', 'Leather'],
		dimensions: { width: 60, depth: 65, height: 75 },
		price: 168000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbDF4t8XJUP2glAjxS1_cqBhaFAbKmim6sVugCbArdLcE1wWgOmaXHY0iYsnJ--SZvBMx6TIulvxyt8EVy_sg4OldE04h-1lENz_Gs-HmiY_U1aavrUwUEIGhT2tzUKKf9hFv7UmkePGzbMinJTxipbdwdbaFL2BvrJwdxkaVIWR3U_KLL1HffsedUqXC_mPrrZCQPdJr20SrqRoV1Sb3Q3a4QnF_UyxD7C6men2Xd2XQiRcoP5Aq-wRGK_65R29F8F6g0mRvVnzY'
	},
	{
		id: 'fnji-006',
		name: 'Console Table',
		category: 'tables',
		materials: ['Walnut', 'Brass'],
		dimensions: { width: 140, depth: 40, height: 85 },
		price: 165000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3oQm7nC8JUF4gu-C4XKEvWGsp-uNGrMh5VIF2Xjq0ADYyU3MxMAUsrtpHtuYr7ok_yHgffwz6rHPb_KF6G-QOhzOR-7kR4Fqa9pP3U5Z-e2KdjNG9Rl8gNqv_r28OxSRxjudgzNVyjh6zFwmaV0qdY_3ZvGFInMN3I4uBb5z1FiqQEbTkVVuXeCWXrYufaciLZogze0cW7VJKBmSyjuTB_smYoKj8qWS2ivaV5keh1ZIkWPD9lCUBaMrosuISgY8PK6vlofkiM7s'
	},
	{
		id: 'fnji-007',
		name: 'Entryway Console',
		category: 'tables',
		materials: ['Oak', 'Metal'],
		dimensions: { width: 120, depth: 35, height: 80 },
		price: 135000,
		status: 'pre_order',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3oQm7nC8JUF4gu-C4XKEvWGsp-uNGrMh5VIF2Xjq0ADYyU3MxMAUsrtpHtuYr7ok_yHgffwz6rHPb_KF6G-QOhzOR-7kR4Fqa9pP3U5Z-e2KdjNG9Rl8gNqv_r28OxSRxjudgzNVyjh6zFwmaV0qdY_3ZvGFInMN3I4uBb5z1FiqQEbTkVVuXeCWXrYufaciLZogze0cW7VJKBmSyjuTB_smYoKj8qWS2ivaV5keh1ZIkWPD9lCUBaMrosuISgY8PK6vlofkiM7s'
	},
	{
		id: 'fnji-008',
		name: 'Mantis Lounge Chair',
		category: 'seating',
		materials: ['Oak', 'Leather'],
		dimensions: { width: 70, depth: 85, height: 75 },
		price: 198000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbDF4t8XJUP2glAjxS1_cqBhaFAbKmim6sVugCbArdLcE1wWgOmaXHY0iYsnJ--SZvBMx6TIulvxyt8EVy_sg4OldE04h-1lENz_Gs-HmiY_U1aavrUwUEIGhT2tzUKKf9hFv7UmkePGzbMinJTxipbdwdbaFL2BvrJwdxkaVIWR3U_KLL1HffsedUqXC_mPrrZCQPdJr20SrqRoV1Sb3Q3a4QnF_UyxD7C6men2Xd2XQiRcoP5Aq-wRGK_65R29F8F6g0mRvVnzY'
	},
	{
		id: 'fnji-009',
		name: 'Lounge Chair',
		category: 'seating',
		materials: ['Walnut', 'Fabric'],
		dimensions: { width: 80, depth: 85, height: 80 },
		price: 175000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbDF4t8XJUP2glAjxS1_cqBhaFAbKmim6sVugCbArdLcE1wWgOmaXHY0iYsnJ--SZvBMx6TIulvxyt8EVy_sg4OldE04h-1lENz_Gs-HmiY_U1aavrUwUEIGhT2tzUKKf9hFv7UmkePGzbMinJTxipbdwdbaFL2BvrJwdxkaVIWR3U_KLL1HffsedUqXC_mPrrZCQPdJr20SrqRoV1Sb3Q3a4QnF_UyxD7C6men2Xd2XQiRcoP5Aq-wRGK_65R29F8F6g0mRvVnzY'
	},
	{
		id: 'fnji-010',
		name: 'H-shaped Side Table Oak',
		category: 'tables',
		materials: ['Oak', 'Brass'],
		dimensions: { width: 70, depth: 40, height: 50 },
		price: 115000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwN-ZP680eDOALwIZrCgOmsTByBuiF8JR5Itd9EzQbll2h9-JBS97thZzays3MzboM469STPK-2aW_ED2hjVNm8aWWQ8vp3OYCfZ0_Y7vz2C_LDeahR6JPUoHxM4NDIVZ0kHdkV3x9CxUFOtC-iL-dHrmhR0SI_JkwEliRJKm2laF6W0RrTOR44jdbV2wOw03XwZYOkm_TR38eW3B_-JjsgNr1rS3CgsaUJdhOtgBFJtyfy_IEeF0eXGUIMZoPDyJaX2sNGWuskYQ'
	},
	{
		id: 'fnji-011',
		name: 'Accent Chair',
		category: 'seating',
		materials: ['Metal', 'Fabric'],
		dimensions: { width: 65, depth: 70, height: 78 },
		price: 145000,
		status: 'pre_order',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbDF4t8XJUP2glAjxS1_cqBhaFAbKmim6sVugCbArdLcE1wWgOmaXHY0iYsnJ--SZvBMx6TIulvxyt8EVy_sg4OldE04h-1lENz_Gs-HmiY_U1aavrUwUEIGhT2tzUKKf9hFv7UmkePGzbMinJTxipbdwdbaFL2BvrJwdxkaVIWR3U_KLL1HffsedUqXC_mPrrZCQPdJr20SrqRoV1Sb3Q3a4QnF_UyxD7C6men2Xd2XQiRcoP5Aq-wRGK_65R29F8F6g0mRvVnzY'
	},
	{
		id: 'fnji-012',
		name: 'Nightstand Cabinet',
		category: 'storage',
		materials: ['Walnut', 'Brass'],
		dimensions: { width: 50, depth: 40, height: 55 },
		price: 95000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgvmt5RBnRsaLnT-qvip6ddT7c5A_PmfKZzxhj93Sl4fwvcAI_qLxziKJiNmW3e3Oos526NXLPE_bY4wlT4XPg-ecexvSnz4LUDJ5_m1Y3GJwjxUBDimBXa-qsmNGUon6MWupnvLmzdBPlhr3r6UoTWRK_9Of1QaBOCNjltABz1jaAoRNeEWiAGaoZhJ0uWXDfyguVjYwXfevcWAn7Rb44E815069SgmjkcDK4RSoba4itDYDJ-hs_GccW2Wsz2-sVg4GBP5DeCG8'
	},
	{
		id: 'fnji-013',
		name: 'Pendant Light',
		category: 'lighting',
		materials: ['Metal', 'Glass'],
		dimensions: { width: 40, depth: 40, height: 60 },
		price: 85000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwN-ZP680eDOALwIZrCgOmsTByBuiF8JR5Itd9EzQbll2h9-JBS97thZzays3MzboM469STPK-2aW_ED2hjVNm8aWWQ8vp3OYCfZ0_Y7vz2C_LDeahR6JPUoHxM4NDIVZ0kHdkV3x9CxUFOtC-iL-dHrmhR0SI_JkwEliRJKm2laF6W0RrTOR44jdbV2wOw03XwZYOkm_TR38eW3B_-JjsgNr1rS3CgsaUJdhOtgBFJtyfy_IEeF0eXGUIMZoPDyJaX2sNGWuskYQ'
	},
	{
		id: 'fnji-014',
		name: 'Floor Lamp',
		category: 'lighting',
		materials: ['Brass', 'Fabric'],
		dimensions: { width: 45, depth: 45, height: 165 },
		price: 125000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3oQm7nC8JUF4gu-C4XKEvWGsp-uNGrMh5VIF2Xjq0ADYyU3MxMAUsrtpHtuYr7ok_yHgffwz6rHPb_KF6G-QOhzOR-7kR4Fqa9pP3U5Z-e2KdjNG9Rl8gNqv_r28OxSRxjudgzNVyjh6zFwmaV0qdY_3ZvGFInMN3I4uBb5z1FiqQEbTkVVuXeCWXrYufaciLZogze0cW7VJKBmSyjuTB_smYoKj8qWS2ivaV5keh1ZIkWPD9lCUBaMrosuISgY8PK6vlofkiM7s'
	},
	{
		id: 'fnji-015',
		name: 'Stone Side Table',
		category: 'tables',
		materials: ['Stone', 'Metal'],
		dimensions: { width: 50, depth: 50, height: 55 },
		price: 195000,
		status: 'pre_order',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwN-ZP680eDOALwIZrCgOmsTByBuiF8JR5Itd9EzQbll2h9-JBS97thZzays3MzboM469STPK-2aW_ED2hjVNm8aWWQ8vp3OYCfZ0_Y7vz2C_LDeahR6JPUoHxM4NDIVZ0kHdkV3x9CxUFOtC-iL-dHrmhR0SI_JkwEliRJKm2laF6W0RrTOR44jdbV2wOw03XwZYOkm_TR38eW3B_-JjsgNr1rS3CgsaUJdhOtgBFJtyfy_IEeF0eXGUIMZoPDyJaX2sNGWuskYQ'
	},
	{
		id: 'fnji-016',
		name: 'Bookshelf Unit',
		category: 'storage',
		materials: ['Oak', 'Metal'],
		dimensions: { width: 100, depth: 35, height: 180 },
		price: 245000,
		status: 'in_stock',
		image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgvmt5RBnRsaLnT-qvip6ddT7c5A_PmfKZzxhj93Sl4fwvcAI_qLxziKJiNmW3e3Oos526NXLPE_bY4wlT4XPg-ecexvSnz4LUDJ5_m1Y3GJwjxUBDimBXa-qsmNGUon6MWupnvLmzdBPlhr3r6UoTWRK_9Of1QaBOCNjltABz1jaAoRNeEWiAGaoZhJ0uWXDfyguVjYwXfevcWAn7Rb44E815069SgmjkcDK4RSoba4itDYDJ-hs_GccW2Wsz2-sVg4GBP5DeCG8'
	}
];

// Generate SQL
console.log('-- FNJI Products Seed Data');
console.log('-- Generated: ' + new Date().toISOString());
console.log('');
console.log('DELETE FROM fnji_products;');
console.log('');

for (const p of products) {
	const materials = JSON.stringify(p.materials).replace(/'/g, "''");
	console.log(`INSERT INTO fnji_products (id, name, category, materials, dimensions_width, dimensions_depth, dimensions_height, price, status, image_url) VALUES (
  '${p.id}',
  '${p.name.replace(/'/g, "''")}',
  '${p.category}',
  '${materials}',
  ${p.dimensions.width},
  ${p.dimensions.depth},
  ${p.dimensions.height},
  ${p.price},
  '${p.status}',
  '${p.image_url}'
);`);
	console.log('');
}

console.log('-- Total: ' + products.length + ' products');
