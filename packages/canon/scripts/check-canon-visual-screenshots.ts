#!/usr/bin/env tsx
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

type ScreenshotGroup = 'form' | 'feedback' | 'clear' | 'navigation' | 'data';
type ScreenshotViewport = {
	id: 'desktop' | 'mobile';
	width: number;
	height: number;
	minHeight: number;
};
type ScreenshotResult = ReturnType<typeof buildScreenshotResult>;

const groups: ScreenshotGroup[] = ['form', 'feedback', 'clear', 'navigation', 'data'];
const viewports: ScreenshotViewport[] = [
	{ id: 'desktop', width: 1280, height: 900, minHeight: 600 },
	{ id: 'mobile', width: 390, height: 844, minHeight: 500 }
];
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const repoRoot = resolve(packageRoot, '../..');

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

function buildScreenshotResult(input: {
	group: ScreenshotGroup;
	viewport: ScreenshotViewport;
	url: string;
	file: string;
	inspected: ReturnType<typeof inspectPng>;
}) {
	return {
		group: input.group,
		viewport: input.viewport.id,
		url: input.url,
		file: input.file,
		expectedViewport: {
			width: input.viewport.width,
			height: input.viewport.height,
			minHeight: input.viewport.minHeight
		},
		image: input.inspected,
		checks: {
			meetsMinimumDimensions:
				input.inspected.width >= input.viewport.width && input.inspected.height >= input.viewport.minHeight,
			hasNoHorizontalOverflow: input.inspected.width <= input.viewport.width + 2,
			hasColorVariance: input.inspected.uniqueColors >= 16,
			isNonBlank: input.inspected.nonWhiteRatio >= 0.01
		}
	};
}

async function findOpenPort(start: number): Promise<number> {
	for (let port = start; port < start + 40; port += 1) {
		const available = await new Promise<boolean>((resolveAvailable) => {
			const server = createServer();
			server.once('error', () => resolveAvailable(false));
			server.once('listening', () => {
				server.close(() => resolveAvailable(true));
			});
			server.listen(port, '127.0.0.1');
		});

		if (available) return port;
	}

	throw new Error(`No open localhost port found starting at ${start}.`);
}

function spawnCommand(
	command: string,
	args: string[],
	options: { cwd: string; env?: NodeJS.ProcessEnv }
): ChildProcessWithoutNullStreams {
	return spawn(command, args, {
		cwd: options.cwd,
		env: options.env ?? process.env,
		stdio: ['ignore', 'pipe', 'pipe']
	});
}

async function runCommand(command: string, args: string[], cwd: string): Promise<string> {
	const child = spawnCommand(command, args, { cwd });
	let output = '';

	child.stdout.on('data', (chunk) => {
		output += chunk.toString();
	});
	child.stderr.on('data', (chunk) => {
		output += chunk.toString();
	});

	const code = await new Promise<number | null>((resolveCode) => {
		child.once('close', resolveCode);
	});

	if (code !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit ${code}\n${output.trim()}`);
	}

	return output;
}

async function waitForRoute(url: string, server: ChildProcessWithoutNullStreams, logs: string[]): Promise<void> {
	const startedAt = Date.now();

	while (Date.now() - startedAt < 60_000) {
		if (server.exitCode !== null) {
			throw new Error(`Canon dev server exited before ${url} was ready.\n${logs.slice(-30).join('')}`);
		}

		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
			if (response.ok) return;
		} catch {
			// Vite may still be starting.
		}

		await delay(500);
	}

	throw new Error(`Timed out waiting for ${url}.\n${logs.slice(-30).join('')}`);
}

function paethPredictor(left: number, up: number, upLeft: number): number {
	const estimate = left + up - upLeft;
	const leftDistance = Math.abs(estimate - left);
	const upDistance = Math.abs(estimate - up);
	const upLeftDistance = Math.abs(estimate - upLeft);

	if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
	if (upDistance <= upLeftDistance) return up;
	return upLeft;
}

function inspectPng(path: string): {
	width: number;
	height: number;
	sampledPixels: number;
	uniqueColors: number;
	nonWhiteRatio: number;
} {
	const buffer = readFileSync(path);
	const signature = buffer.subarray(0, 8).toString('hex');
	if (signature !== '89504e470d0a1a0a') throw new Error(`${path} is not a PNG file.`);

	let offset = 8;
	let width = 0;
	let height = 0;
	let bitDepth = 0;
	let colorType = 0;
	const idatChunks: Buffer[] = [];

	while (offset < buffer.length) {
		const length = buffer.readUInt32BE(offset);
		const type = buffer.toString('ascii', offset + 4, offset + 8);
		const dataStart = offset + 8;
		const dataEnd = dataStart + length;
		const data = buffer.subarray(dataStart, dataEnd);

		if (type === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			bitDepth = data.readUInt8(8);
			colorType = data.readUInt8(9);
		} else if (type === 'IDAT') {
			idatChunks.push(Buffer.from(data));
		} else if (type === 'IEND') {
			break;
		}

		offset = dataEnd + 4;
	}

	const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
	if (!width || !height || bitDepth !== 8 || channels === 0) {
		throw new Error(`${path} uses unsupported PNG format: ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}.`);
	}

	const raw = inflateSync(Buffer.concat(idatChunks));
	const bytesPerPixel = channels;
	const rowLength = width * channels;
	let rawOffset = 0;
	let previousRow = Buffer.alloc(rowLength);
	const colors = new Set<string>();
	let sampledPixels = 0;
	let nonWhitePixels = 0;
	const sampleX = Math.max(1, Math.floor(width / 120));
	const sampleY = Math.max(1, Math.floor(height / 120));

	for (let y = 0; y < height; y += 1) {
		const filter = raw[rawOffset++];
		const row = Buffer.alloc(rowLength);

		for (let index = 0; index < rowLength; index += 1) {
			const byte = raw[rawOffset + index];
			const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
			const up = previousRow[index] ?? 0;
			const upLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;

			if (filter === 0) row[index] = byte;
			else if (filter === 1) row[index] = (byte + left) & 255;
			else if (filter === 2) row[index] = (byte + up) & 255;
			else if (filter === 3) row[index] = (byte + Math.floor((left + up) / 2)) & 255;
			else if (filter === 4) row[index] = (byte + paethPredictor(left, up, upLeft)) & 255;
			else throw new Error(`${path} uses unsupported PNG filter ${filter}.`);
		}

		if (y % sampleY === 0) {
			for (let x = 0; x < width; x += sampleX) {
				const pixelIndex = x * channels;
				const red = row[pixelIndex];
				const green = row[pixelIndex + 1];
				const blue = row[pixelIndex + 2];
				const alpha = channels === 4 ? row[pixelIndex + 3] : 255;

				colors.add(`${red},${green},${blue},${alpha}`);
				sampledPixels += 1;
				if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
					nonWhitePixels += 1;
				}
			}
		}

		rawOffset += rowLength;
		previousRow = row;
	}

	return {
		width,
		height,
		sampledPixels,
		uniqueColors: colors.size,
		nonWhiteRatio: sampledPixels === 0 ? 0 : nonWhitePixels / sampledPixels
	};
}

async function main() {
	const requestedPort = Number.parseInt(readFlag('--port') ?? '4187', 10);
	const port = await findOpenPort(Number.isFinite(requestedPort) ? requestedPort : 4187);
	const outputDir = resolve(readFlag('--output') ?? resolve(repoRoot, 'output/playwright/canon-visual-evidence'));
	mkdirSync(outputDir, { recursive: true });
	for (const entry of readdirSync(outputDir)) {
		if (entry.endsWith('.png')) unlinkSync(resolve(outputDir, entry));
	}

	const serverLogs: string[] = [];
	const server = spawnCommand(
		'corepack',
		['pnpm', 'exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
		{ cwd: packageRoot }
	);

	server.stdout.on('data', (chunk) => serverLogs.push(chunk.toString()));
	server.stderr.on('data', (chunk) => serverLogs.push(chunk.toString()));

	try {
		const formUrl = `http://127.0.0.1:${port}/visual-evidence/form`;
		await waitForRoute(formUrl, server, serverLogs);

		const results: ScreenshotResult[] = [];
		for (const group of groups) {
			const url = `http://127.0.0.1:${port}/visual-evidence/${group}`;
			for (const viewport of viewports) {
				const file = resolve(outputDir, `${group}-${viewport.id}.png`);
				await runCommand(
					'npx',
					[
						'--yes',
						'playwright',
						'screenshot',
						'--browser',
						'chromium',
						'--viewport-size',
						`${viewport.width},${viewport.height}`,
						'--full-page',
						'--wait-for-selector',
						`[data-visual-evidence="${group}"]`,
						'--wait-for-timeout',
						'1000',
						url,
						file
					],
					packageRoot
				);

				const inspected = inspectPng(file);
				if (inspected.width < viewport.width || inspected.height < viewport.minHeight) {
					throw new Error(`${file} is unexpectedly small: ${inspected.width}x${inspected.height}.`);
				}
				if (inspected.width > viewport.width + 2) {
					throw new Error(
						`${file} exceeds viewport width ${viewport.width}: ${inspected.width}px. Check for horizontal overflow.`
					);
				}
				if (inspected.uniqueColors < 16 || inspected.nonWhiteRatio < 0.01) {
					throw new Error(
						`${file} appears blank: uniqueColors=${inspected.uniqueColors}, nonWhiteRatio=${inspected.nonWhiteRatio.toFixed(3)}.`
					);
				}

				results.push(buildScreenshotResult({ group, viewport, url, file, inspected }));
			}
		}

		const expectedScreenshots = groups.length * viewports.length;
		if (results.length !== expectedScreenshots) {
			throw new Error(`Expected ${expectedScreenshots} screenshots, captured ${results.length}.`);
		}

		const manifest = {
			status: 'passed',
			generatedAt: new Date().toISOString(),
			source: {
				route: '/visual-evidence/[group]',
				groups,
				viewports: viewports.map((viewport) => ({
					id: viewport.id,
					width: viewport.width,
					height: viewport.height,
					minHeight: viewport.minHeight
				}))
			},
			summary: {
				totalScreenshots: results.length,
				expectedScreenshots,
				outputDir
			},
			results
		};
		writeFileSync(resolve(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

		console.log('Canon visual screenshot evidence passed.');
		console.log(`Manifest: ${resolve(outputDir, 'manifest.json')}`);
		for (const result of results) {
			console.log(
				`- ${result.group}/${result.viewport}: ${result.image.width}x${result.image.height}, ${result.image.uniqueColors} sampled colors, nonWhiteRatio=${result.image.nonWhiteRatio.toFixed(3)} (${result.file})`
			);
		}
	} finally {
		server.kill('SIGTERM');
		await delay(250);
		if (server.exitCode === null) server.kill('SIGKILL');
	}
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
