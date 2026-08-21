import { writeFile } from 'node:fs/promises';

import { nativeThresholdDwellingSpatialPackageProjection } from '../src/lib/workway/threshold-dwelling-spatial-package.js';

const fixtureUrl = new URL(
  '../../../apps/workway-visionos/Sources/WorkWaySpatialContract/Resources/threshold-dwelling-r08-spatial-package.json',
  import.meta.url
);

await writeFile(
  fixtureUrl,
  `${JSON.stringify(nativeThresholdDwellingSpatialPackageProjection(), null, 2)}\n`
);
