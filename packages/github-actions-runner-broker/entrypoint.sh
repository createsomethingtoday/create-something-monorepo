#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${JIT_CONFIG:-}" ]]; then
  echo "JIT_CONFIG is required" >&2
  exit 64
fi

runner_jit_config="${JIT_CONFIG}"
unset JIT_CONFIG

cd /runner
exec ./run.sh --jitconfig "${runner_jit_config}"
