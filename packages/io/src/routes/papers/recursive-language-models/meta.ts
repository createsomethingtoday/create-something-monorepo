import type { PaperMeta } from '../types';

export const meta: PaperMeta = {
	slug: 'recursive-language-models',
	title: 'Recursive Language Models: Context as Environment Variable',
	subtitle:
		"Implementing MIT CSAIL's RLM pattern for processing arbitrarily large codebases through programmatic context navigation",
	description:
		'This paper documents the implementation and empirical validation of Recursive Language Models (RLMs) based on MIT CSAIL research. We identified critical bugs, validated the pattern against the original repository, and demonstrated practical application for codebase analysis—processing 157K characters to find 165+ DRY violations.',
	category: 'research',
	readingTime: 15,
	difficulty: 'advanced',
	date: '2026-01-19',
	keywords: [
		'RLM',
		'Recursive Language Models',
		'Long Context',
		'Code Analysis',
		'DRY',
		'MIT CSAIL',
		'Agent SDK'
	]
};
