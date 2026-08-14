# Canonical verifier + tests path resolution for Harbor web tasks.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="${HARBOR_TESTS_DIR:-/tests}"
if [ ! -f "${TESTS_DIR}/test_state.py" ] && [ -f "${SCRIPT_DIR}/test_state.py" ]; then
  TESTS_DIR="${SCRIPT_DIR}"
fi
VERIFIER_DIR="${HARBOR_VERIFIER_DIR:-/logs/verifier}"
if ! mkdir -p "${VERIFIER_DIR}" 2>/dev/null; then
  echo "error: cannot create verifier directory: ${VERIFIER_DIR}" >&2
  exit 1
fi
