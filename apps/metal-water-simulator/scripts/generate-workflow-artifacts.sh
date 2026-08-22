#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_directory/../../.." && pwd)
output_directory="$repository_root/apps/metal-water-simulator/Sources/WaterSimulationCore/WorkflowArtifacts"
output_relative="apps/metal-water-simulator/Sources/WaterSimulationCore/WorkflowArtifacts"
artifact_parent=$(dirname -- "$output_directory")
staging_root=$(mktemp -d "$artifact_parent/.workflow-artifacts-stage.XXXXXX")
generated_output="$staging_root/generated"
snapshot_output="$staging_root/snapshot"
backup_output="$staging_root/previous"

cleanup() {
  if [ -e "$backup_output" ] && [ ! -e "$output_directory" ]; then
    mv "$backup_output" "$output_directory"
  fi
  rm -rf -- "$staging_root"
}

handle_signal() {
  cleanup
  trap - EXIT
  exit 1
}

trap cleanup EXIT
trap handle_signal HUP INT TERM

pnpm --dir "$repository_root" --filter @create-something/workflow-compiler build

if [ -e "$output_directory/governed-interaction.json" ]; then
  node "$repository_root/packages/workflow-compiler/dist/cli.js" verify \
    --dir "$output_directory"
elif [ -e "$output_directory" ]; then
  node -e '
    const { readFileSync } = require("node:fs");
    const manifest = JSON.parse(readFileSync(process.argv[1], "utf8"));
    if (
      manifest.schemaVersion !== "workflow_artifact_manifest.v0.1" ||
      manifest.workflowId !== "webflow.marketplace.template-lifecycle" ||
      manifest.compilerVersion !== "workflow-compiler-v0.1"
    ) {
      throw new Error("Refusing to replace an unidentified legacy workflow bundle.");
    }
  ' "$output_directory/manifest.json"
  git -C "$repository_root" diff --quiet HEAD -- "$output_relative"
  untracked_artifacts=$(git -C "$repository_root" ls-files --others --exclude-standard -- "$output_relative")
  if [ -n "$untracked_artifacts" ]; then
    echo "Refusing to replace a legacy workflow bundle with untracked files." >&2
    exit 1
  fi
fi

node "$repository_root/packages/workflow-compiler/dist/cli.js" compile \
  --workflow "$repository_root/packages/workflow-compiler/fixtures/marketplace/workflow.json" \
  --cases "$repository_root/packages/workflow-compiler/fixtures/marketplace/cases.json" \
  --out "$generated_output"

mkdir "$snapshot_output"
cp -R -L "$generated_output/." "$snapshot_output"
node "$repository_root/packages/workflow-compiler/dist/cli.js" verify \
  --dir "$snapshot_output"

if [ -e "$output_directory" ]; then
  mv "$output_directory" "$backup_output"
fi
mv "$snapshot_output" "$output_directory"
