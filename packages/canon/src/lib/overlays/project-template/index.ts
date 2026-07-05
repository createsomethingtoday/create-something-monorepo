export {
	CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST,
	CANON_PROJECT_OVERLAY_TEMPLATE_ROOT
} from './manifest.js';
export { CANON_PROJECT_OVERLAY_TEMPLATE_FILES } from './files.js';

export {
	createCanonProjectOverlayManifest,
	instantiateCanonProjectOverlayTemplate,
	renderCanonProjectOverlayTemplateFiles
} from './instantiate.js';
export type {
	CanonProjectOverlayInstantiateFile,
	CanonProjectOverlayInstantiateOptions,
	CanonProjectOverlayInstantiateResult
} from './instantiate.js';
