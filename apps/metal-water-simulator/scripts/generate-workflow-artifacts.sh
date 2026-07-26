#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_directory/../../.." && pwd)
output_directory="$repository_root/apps/metal-water-simulator/Sources/WaterSimulationCore/WorkflowArtifacts"

pnpm --dir "$repository_root" --filter @create-something/workflow-compiler build
node "$repository_root/packages/workflow-compiler/dist/cli.js" compile \
  --workflow "$repository_root/packages/workflow-compiler/fixtures/marketplace/workflow.json" \
  --cases "$repository_root/packages/workflow-compiler/fixtures/marketplace/cases.json" \
  --out "$output_directory"
