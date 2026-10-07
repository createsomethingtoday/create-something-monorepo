#!/usr/bin/env bash
# Run the 20-version pilot across the three hypothesis arms, then judge and report.
set -euo pipefail
cd "$(dirname "$0")/.."
INF="infisical run --projectId e1532079-2f2b-46b5-8972-cf7a025eb803 --env prod --path / --"
for arm in astra daybreak astra-subagents; do
  node scripts/run-arm.mjs --arm "$arm" --pilot
done
for arm in astra daybreak astra-subagents; do
  $INF node scripts/judge.mjs --arm "$arm"
done
node scripts/report.mjs
