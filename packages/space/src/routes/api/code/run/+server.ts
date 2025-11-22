import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WorkersCodeRunner } from '$lib/server/workers-code-runner';
import type {
	WorkersCodeExecutionOptions,
	WorkersCodeExecutionResult
} from '$lib/server/workers-code-runner';

interface RunCodeRequest {
	code: string;
	timeout?: number;
}

interface RunCodeResponse extends WorkersCodeExecutionResult {
	platform: 'cloudflare-workers';
}

/**
 * Native JavaScript code execution using Cloudflare Workers runtime
 * Hermeneutic insight: We're already in a code execution environment!
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: RunCodeRequest = await request.json();
		const { code, timeout } = body;

		if (!code) {
			return json(
				{
					success: false,
					error: 'Missing required field: code',
					platform: 'cloudflare-workers'
				},
				{ status: 400 }
			);
		}

		console.log('🚀 Executing code natively in Cloudflare Workers runtime');

		const runner = new WorkersCodeRunner();

		const options: WorkersCodeExecutionOptions = {
			code,
			timeout: timeout || 5000
		};

		const result = await runner.executeCode(options);

		return json({
			...result,
			platform: 'cloudflare-workers'
		});
	} catch (error) {
		console.error('Code execution error:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				platform: 'cloudflare-workers'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET endpoint to check runtime capabilities
 */
export const GET: RequestHandler = async () => {
	return json({
		available: true,
		platform: 'cloudflare-workers',
		runtime: 'V8',
		supportedLanguages: ['javascript'],
		features: {
			nativeExecution: true,
			asyncAwait: true,
			es2022: true,
			webApis: true,
			timeout: true,
			consoleLogging: true
		},
		limitations: {
			maxTimeout: 5000,
			cpuTime: '10ms per request',
			memory: 'Limited by Workers runtime'
		}
	});
};
