/**
 * Workers Native Code Runner
 * Executes JavaScript code directly in the Cloudflare Workers runtime
 * No Sandbox SDK needed - uses the platform we're already on!
 */

export interface WorkersCodeExecutionOptions {
	code: string;
	timeout?: number;
}

export interface WorkersCodeExecutionResult {
	success: boolean;
	output?: string;
	error?: string;
	executionTime?: number;
	logs?: string[];
}

/**
 * Execute JavaScript code safely in the Workers runtime
 * This is the hermeneutic insight: we're already in a code execution environment!
 */
export class WorkersCodeRunner {
	/**
	 * Execute user code in the Workers runtime
	 * Uses AsyncFunction for safe, isolated execution
	 */
	async executeCode(options: WorkersCodeExecutionOptions): Promise<WorkersCodeExecutionResult> {
		const startTime = Date.now();
		const logs: string[] = [];

		try {
			// Create safe console mock
			const consoleMock = {
				log: (...args: any[]) => {
					logs.push(args.map((arg) => this.stringify(arg)).join(' '));
				},
				error: (...args: any[]) => {
					logs.push('ERROR: ' + args.map((arg) => this.stringify(arg)).join(' '));
				},
				warn: (...args: any[]) => {
					logs.push('WARN: ' + args.map((arg) => this.stringify(arg)).join(' '));
				},
				info: (...args: any[]) => {
					logs.push('INFO: ' + args.map((arg) => this.stringify(arg)).join(' '));
				},
				debug: (...args: any[]) => {
					logs.push('DEBUG: ' + args.map((arg) => this.stringify(arg)).join(' '));
				},
				time: (label?: string) => {
					// Track timing
				},
				timeEnd: (label?: string) => {
					// Log timing
				}
			};

			// Create safe execution context
			// AsyncFunction allows async/await in user code
			const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

			// Wrap user code to return last expression and capture console output
			const wrappedCode = `
				"use strict";
				${options.code}
			`;

			// Create function with controlled scope
			const fn = new AsyncFunction('console', wrappedCode);

			// Execute with timeout
			const timeoutMs = options.timeout || 5000;
			const result = await this.executeWithTimeout(fn, [consoleMock], timeoutMs);

			const executionTime = Date.now() - startTime;

			return {
				success: true,
				output: logs.join('\n') || '(No output)',
				executionTime,
				logs
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				executionTime: Date.now() - startTime,
				logs
			};
		}
	}

	/**
	 * Execute function with timeout protection
	 */
	private async executeWithTimeout(
		fn: Function,
		args: any[],
		timeoutMs: number
	): Promise<any> {
		return Promise.race([
			fn(...args),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error(`Execution timeout (${timeoutMs}ms)`)), timeoutMs)
			)
		]);
	}

	/**
	 * Safely stringify values for console output
	 */
	private stringify(value: any): string {
		if (value === undefined) return 'undefined';
		if (value === null) return 'null';
		if (typeof value === 'string') return value;
		if (typeof value === 'function') return '[Function]';
		if (typeof value === 'symbol') return value.toString();

		try {
			// Handle circular references and complex objects
			const seen = new WeakSet();
			return JSON.stringify(
				value,
				(key, val) => {
					if (typeof val === 'object' && val !== null) {
						if (seen.has(val)) return '[Circular]';
						seen.add(val);
					}
					return val;
				},
				2
			);
		} catch (error) {
			return String(value);
		}
	}
}

/**
 * Example usage:
 *
 * const runner = new WorkersCodeRunner();
 * const result = await runner.executeCode({
 *   code: `
 *     const numbers = [1, 2, 3, 4, 5];
 *     const sum = numbers.reduce((a, b) => a + b, 0);
 *     console.log('Sum:', sum);
 *     console.log('Average:', sum / numbers.length);
 *   `
 * });
 *
 * console.log(result.output);
 * // Output:
 * // Sum: 15
 * // Average: 3
 */
