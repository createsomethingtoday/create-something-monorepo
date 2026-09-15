import type { BuildReleaseManifest, BuildReleaseArtifactReference } from '../src/build-release.js';
declare const legacy: Extract<BuildReleaseManifest, {schema:'create-something/build-release-manifest@1'}>;
declare const binding: BuildReleaseArtifactReference;
// @ts-expect-error Build v2 requires its runtime binding.
const missing: BuildReleaseManifest = {...legacy,schema:'create-something/build-release-manifest@2'};
// @ts-expect-error Build v1 forbids a runtime binding.
const extra: BuildReleaseManifest = {...legacy,artifacts:{...legacy.artifacts,runtime_binding:binding}};
const valid: BuildReleaseManifest = {...legacy,schema:'create-something/build-release-manifest@2',artifacts:{...legacy.artifacts,runtime_binding:binding}};
void missing; void extra; void valid;
