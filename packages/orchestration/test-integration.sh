#!/bin/bash
# Integration tests for orchestration - run manually or in CI with high memory limit
#
# These tests are memory-intensive because they involve:
# - Background process simulation
# - Witness monitoring loops
# - Convoy coordination
# - Multiple concurrent workers
#
# Usage: ./test-integration.sh

set -e

echo "Running orchestration integration tests..."
echo "NOTE: These tests require significant memory (>2GB recommended)"
echo ""

# Temporarily enable skipped tests
export VITEST_RUN_INTEGRATION=true

# Run only the integration test files
pnpm vitest run test/background-witness.test.ts

echo ""
echo "Integration tests complete."
