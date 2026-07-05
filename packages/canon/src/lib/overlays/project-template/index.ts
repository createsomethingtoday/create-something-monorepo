export {
	CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST,
	CANON_PROJECT_OVERLAY_TEMPLATE_ROOT
} from './manifest.js';
export { CANON_PROJECT_OVERLAY_TEMPLATE_FILES } from './files.js';

export {
	buildCanonProjectOverlayTemplateFilePack,
	createCanonProjectOverlayManifest,
	getCanonProjectOverlayTemplateFile,
	instantiateCanonProjectOverlayTemplate,
	listCanonProjectOverlayTemplateFilePaths,
	renderCanonProjectOverlayTemplateFileMarkdown,
	renderCanonProjectOverlayTemplateFilePackMarkdown,
	renderCanonProjectOverlayTemplateFiles
} from './instantiate.js';
export type {
	CanonProjectOverlayInstantiateFile,
	CanonProjectOverlayInstantiateOptions,
	CanonProjectOverlayInstantiateResult,
	CanonProjectOverlayTemplateFile,
	CanonProjectOverlayTemplateFilePack
} from './instantiate.js';
