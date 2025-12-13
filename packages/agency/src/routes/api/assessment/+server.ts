import { json, error, type RequestEvent } from '@sveltejs/kit';

interface AssessmentBody {
	sessionId: string;
	answers: {
		accumulating: string[];
		removalInsight: string;
		blockers: string[];
	};
	result: {
		recommendation: {
			service: string;
			caseStudy: string;
		};
		analysis: {
			triadLevel: string;
		};
	};
	timings?: {
		q1?: number;
		q2?: number;
		q3?: number;
		total?: number;
	};
}

export const POST = async ({ request, platform }: RequestEvent) => {
	try {
		const body = (await request.json()) as AssessmentBody;
		const { sessionId, answers, result, timings } = body;

		// Validate required fields
		if (!sessionId || !answers || !result) {
			throw error(400, 'Missing required fields');
		}

		const db = platform?.env?.DB;

		if (db) {
			try {
				await db
					.prepare(
						`
					INSERT INTO assessment_responses (
						session_id,
						accumulating,
						removal_insight,
						blockers,
						recommended_service,
						recommended_case_study,
						triad_level,
						time_on_q1_ms,
						time_on_q2_ms,
						time_on_q3_ms,
						total_time_ms,
						completed_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
				`
					)
					.bind(
						sessionId,
						JSON.stringify(answers.accumulating),
						answers.removalInsight,
						JSON.stringify(answers.blockers),
						result.recommendation.service,
						result.recommendation.caseStudy,
						result.analysis.triadLevel,
						timings?.q1 || null,
						timings?.q2 || null,
						timings?.q3 || null,
						timings?.total || null
					)
					.run();
			} catch (dbError) {
				// Log but don't fail - table might not exist yet
				console.warn('Failed to insert assessment response:', dbError);
			}
		}

		return json({
			success: true,
			sessionId
		});
	} catch (err) {
		console.error('Assessment submission error:', err);
		throw error(500, 'Failed to submit assessment');
	}
};

export const GET = async ({ url, platform }: RequestEvent) => {
	const sessionId = url.searchParams.get('session');

	if (!sessionId) {
		throw error(400, 'Missing session ID');
	}

	const db = platform?.env?.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const response = await db
			.prepare(
				`
			SELECT * FROM assessment_responses
			WHERE session_id = ?
		`
			)
			.bind(sessionId)
			.first();

		if (!response) {
			throw error(404, 'Assessment not found');
		}

		return json({
			success: true,
			assessment: {
				...response,
				accumulating: JSON.parse((response.accumulating as string) || '[]'),
				blockers: JSON.parse((response.blockers as string) || '[]')
			}
		});
	} catch (err) {
		console.error('Failed to fetch assessment:', err);
		throw error(500, 'Failed to fetch assessment');
	}
};
