import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Airtable from 'airtable';

export const GET: RequestHandler = async ({ platform, url, locals }) => {
	// Use session email if available, otherwise use query param
	const sessionEmail = locals.user?.email;
	const testEmail = sessionEmail || url.searchParams.get('email') || 'micah@createsomething.io';
	
	// Debug endpoint to check environment configuration
	const envStatus = {
		hasPlatform: !!platform,
		hasEnv: !!platform?.env,
		hasApiKey: !!platform?.env?.AIRTABLE_API_KEY,
		hasBaseId: !!platform?.env?.AIRTABLE_BASE_ID,
		baseIdPrefix: platform?.env?.AIRTABLE_BASE_ID?.substring(0, 8) || 'NOT SET',
		baseIdSuffix: platform?.env?.AIRTABLE_BASE_ID?.slice(-4) || 'NOT SET',
		baseIdFull: platform?.env?.AIRTABLE_BASE_ID || 'NOT SET',
		apiKeyPrefix: platform?.env?.AIRTABLE_API_KEY?.substring(0, 10) || 'NOT SET',
		testEmail
	};

	// Try to query Airtable directly
	let airtableResult = null;
	let airtableError = null;
	
	if (platform?.env?.AIRTABLE_API_KEY && platform?.env?.AIRTABLE_BASE_ID) {
		try {
			const base = new Airtable({ apiKey: platform.env.AIRTABLE_API_KEY }).base(platform.env.AIRTABLE_BASE_ID);
			const formula = `OR(
				FIND("${testEmail}", ARRAYJOIN({📧Email}, ",")) > 0,
				FIND("${testEmail}", ARRAYJOIN({📧WF Account Email}, ",")) > 0,
				FIND("${testEmail}", ARRAYJOIN({📧Emails}, ",")) > 0
			)`;
			
			const records = await base('tbljt0plqxdMARZXb')
				.select({ filterByFormula: formula })
				.firstPage();
			
			airtableResult = {
				recordCount: records.length,
				firstRecordId: records[0]?.id || null,
				firstRecordName: records[0]?.fields?.Name || null,
				formula: formula.replace(/\n/g, ' ').replace(/\t/g, '')
			};
		} catch (err) {
			airtableError = {
				message: err instanceof Error ? err.message : 'Unknown error',
				stack: err instanceof Error ? err.stack : undefined
			};
		}
	}

	return json({
		env: envStatus,
		session: {
			hasUser: !!locals.user,
			sessionEmail: locals.user?.email || null
		},
		airtableResult,
		airtableError
	});
};
