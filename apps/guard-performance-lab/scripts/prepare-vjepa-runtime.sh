#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="${GUARD_VJEPA_RUNTIME_DIR:-${PACKAGE_DIR}/.data/vjepa2-runtime}"
REPOSITORY_DIR="${RUNTIME_DIR}/repo"
VENV_DIR="${RUNTIME_DIR}/venv"
CHECKPOINT_PATH="${RUNTIME_DIR}/vjepa2_1_vitb_dist_vitG_384.pt"
REPOSITORY_URL="https://github.com/facebookresearch/vjepa2.git"
REPOSITORY_COMMIT="204698b45b3712590f06245fbfba32d3be539812"
CHECKPOINT_URL="https://dl.fbaipublicfiles.com/vjepa2/vjepa2_1_vitb_dist_vitG_384.pt"
CHECKPOINT_SHA256="848a77c33cc9e6649ed2119c9bea1e2c569bcdab9539ff3e7c02ccc2959ddf4d"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required to prepare the isolated V-JEPA runtime." >&2
  exit 1
fi

mkdir -p "${RUNTIME_DIR}"
if [[ ! -d "${REPOSITORY_DIR}/.git" ]]; then
  git clone --filter=blob:none --no-checkout "${REPOSITORY_URL}" "${REPOSITORY_DIR}"
fi
git -C "${REPOSITORY_DIR}" fetch --depth 1 origin "${REPOSITORY_COMMIT}"
git -C "${REPOSITORY_DIR}" checkout --detach "${REPOSITORY_COMMIT}"

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  uv venv --python 3.12 "${VENV_DIR}"
fi
uv pip install --python "${VENV_DIR}/bin/python" \
  "torch==2.13.0" \
  "torchvision==0.28.0" \
  "timm==1.0.28" \
  "einops==0.8.2" \
  "opencv-python-headless==4.13.0.92" \
  "numpy==2.5.2"

if [[ ! -f "${CHECKPOINT_PATH}" ]] || [[ "$(shasum -a 256 "${CHECKPOINT_PATH}" | awk '{print $1}')" != "${CHECKPOINT_SHA256}" ]]; then
  CHECKPOINT_TEMP="${CHECKPOINT_PATH}.download"
  curl --fail --location --retry 3 --output "${CHECKPOINT_TEMP}" "${CHECKPOINT_URL}"
  if [[ "$(shasum -a 256 "${CHECKPOINT_TEMP}" | awk '{print $1}')" != "${CHECKPOINT_SHA256}" ]]; then
    echo "Downloaded V-JEPA checkpoint failed its pinned SHA-256 check." >&2
    exit 1
  fi
  mv "${CHECKPOINT_TEMP}" "${CHECKPOINT_PATH}"
fi

"${VENV_DIR}/bin/python" "${PACKAGE_DIR}/scripts/vjepa-runtime-doctor.py" --runtime "${RUNTIME_DIR}"
