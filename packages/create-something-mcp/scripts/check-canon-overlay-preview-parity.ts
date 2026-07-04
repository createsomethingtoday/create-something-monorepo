#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
	createCanonProjectOverlayManifest,
	renderCanonProjectOverlayTemplateFiles
} from '../../canon/src/lib/overlays/project-template/index.js';
import { createCanonOverlayInstantiatePreview } from '../src/canon-overlay-preview.js';

const options = {
	id: 'overlay.parity-client',
	name: 'Parity Client Overlay',
	owner: 'canon-system',
	sourcePackage: '@create-something/parity-client',
	outputRoot: 'packages/parity-client/src/canon/overlay',
	targetModalities: ['web', 'chat', 'app'],
	tags: ['canon', 'overlay', 'parity']
} as const;

const canonManifest = createCanonProjectOverlayManifest(options);
const canonFiles = renderCanonProjectOverlayTemplateFiles(options);
const mcpPreviewWithContent = createCanonOverlayInstantiatePreview({
	...options,
	targetModalities: [...options.targetModalities],
	tags: [...options.tags],
	includeContent: true
});
const mcpPreviewWithoutContent = createCanonOverlayInstantiatePreview({
	...options,
	targetModalities: [...options.targetModalities],
	tags: [...options.tags],
	includeContent: false
});

assert.deepEqual(
	mcpPreviewWithContent.manifest,
	canonManifest,
	'MCP overlay preview manifest must match the Canon overlay manifest'
);

assert.deepEqual(
	mcpPreviewWithContent.files.map(({ relativePath, path, content }) => ({
		relativePath,
		path,
		content
	})),
	canonFiles,
	'MCP overlay preview file contents must match Canon rendered template files'
);

assert.deepEqual(
	mcpPreviewWithContent.files.map((file) => file.action),
	Array(canonFiles.length).fill('would-create'),
	'MCP overlay preview must remain a no-write plan'
);

assert.deepEqual(
	mcpPreviewWithoutContent.files.map(({ relativePath, path }) => ({ relativePath, path })),
	canonFiles.map(({ relativePath, path }) => ({ relativePath, path })),
	'MCP overlay preview without contents must keep the Canon file plan'
);

assert.deepEqual(
	mcpPreviewWithoutContent.files.map((file) => file.content),
	Array(canonFiles.length).fill(''),
	'MCP overlay preview without contents must omit generated file bodies'
);

assert.equal(mcpPreviewWithContent.files.length, 8, 'Canon overlay preview must plan eight files');

console.log('Canon overlay MCP preview parity passed.');
