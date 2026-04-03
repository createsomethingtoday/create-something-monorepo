#!/usr/bin/env node

import { createHmac, randomUUID } from 'node:crypto';

function readFlag(name) {
	const value = process.env[name]?.trim();
	return value && value.length > 0 ? value : null;
}

function parseArgs(argv) {
	const parsed = {};

	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (!value.startsWith('--')) {
			continue;
		}

		const key = value.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith('--')) {
			parsed[key] = 'true';
			continue;
		}

		parsed[key] = next;
		index += 1;
	}

	return parsed;
}

function toBase64Url(input) {
	return Buffer.from(input, 'utf8')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function signToken(payload, secret) {
	const payloadPart = toBase64Url(JSON.stringify(payload));
	const signaturePart = createHmac('sha256', secret)
		.update(payloadPart)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');

	return `${payloadPart}.${signaturePart}`;
}

function appendGrantParam(baseUrl, token) {
	const url = new URL(baseUrl);
	url.searchParams.set('grant', token);
	return url.toString();
}

function fail(message) {
	console.error(message);
	process.exit(1);
}

const secret = readFlag('ABUNDANCE_INTAKE_SIGNING_SECRET');
if (!secret) {
	fail('ABUNDANCE_INTAKE_SIGNING_SECRET is required.');
}

const args = parseArgs(process.argv.slice(2));
const candidateId = args.candidate ?? args.sub ?? args.subject;
if (!candidateId || candidateId.trim().length === 0) {
	fail('Pass --candidate <id> (or --sub / --subject).');
}

const ttlHoursRaw = args['ttl-hours'] ?? '72';
const ttlHours = Number(ttlHoursRaw);
if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
	fail(`Invalid --ttl-hours value: ${ttlHoursRaw}`);
}

const nowSeconds = Math.floor(Date.now() / 1000);
const payload = {
	v: 1,
	scope: 'nurse_intake',
	sub: candidateId.trim(),
	grantId: args['grant-id']?.trim() || randomUUID(),
	exp: nowSeconds + Math.floor(ttlHours * 60 * 60),
	...(args.email ? { email: args.email.trim() } : {}),
	...(args.name ? { name: args.name.trim() } : {})
};

const token = signToken(payload, secret);
const baseUrl = args['base-url']?.trim();

console.log(
	JSON.stringify(
		{
			payload,
			expiresAt: new Date(payload.exp * 1000).toISOString(),
			token,
			url: baseUrl ? appendGrantParam(baseUrl, token) : undefined
		},
		null,
		2
	)
);
