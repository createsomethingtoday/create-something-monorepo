#!/usr/bin/env tsx

export type CliArgs = Record<string, string | boolean>;

export function parseCliArgs(argv: string[]): CliArgs {
	const parsed: CliArgs = {};

	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		if (!token?.startsWith('--')) continue;

		const key = token.slice(2);
		const next = argv[i + 1];
		if (!next || next.startsWith('--')) {
			parsed[key] = true;
			continue;
		}

		parsed[key] = next;
		i += 1;
	}

	return parsed;
}

export function getStringArg(args: CliArgs, key: string): string | undefined {
	const value = args[key];
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function getBooleanArg(args: CliArgs, key: string, fallback = false): boolean {
	const value = args[key];
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return fallback;
	const normalized = value.trim().toLowerCase();
	if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
	if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
	return fallback;
}

export function resolveInput(
	args: CliArgs,
	argKey: string,
	envKey: string,
	fallback?: string,
): string | undefined {
	return getStringArg(args, argKey) ?? process.env[envKey]?.trim() ?? fallback;
}

export function requireInput(
	args: CliArgs,
	argKey: string,
	envKey: string,
	description: string,
): string {
	const value = resolveInput(args, argKey, envKey);
	if (!value) {
		throw new Error(`Missing ${description}. Provide --${argKey} or ${envKey}.`);
	}
	return value;
}

export function parseCsv(raw: string | undefined): string[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
}

export async function postJson<TResponse>(
	url: string,
	headers: Record<string, string>,
	body: Record<string, unknown>,
): Promise<TResponse> {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		body: JSON.stringify(body),
	});

	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		const message =
			payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
				? payload.message
				: `Request failed (${response.status})`;
		throw new Error(`${message} [${url}]`);
	}

	return payload as TResponse;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function printJson(value: unknown): void {
	console.log(JSON.stringify(value, null, 2));
}
