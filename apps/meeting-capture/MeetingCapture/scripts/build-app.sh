#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

CONFIGURATION="release"
INSTALL_APP=0
INSTALL_DIR="/Applications"
APP_NAME="Meeting Capture.app"
LEGACY_APP_NAME="MeetingCapture.app"
PRODUCT_NAME="MeetingCapture"
APP_BUNDLE_ID="com.createsomething.meeting-capture"
SIGN_IDENTITY=""

detect_sign_identity() {
  local identities
  local preferred

  identities="$(security find-identity -v -p codesigning 2>/dev/null || true)"
  preferred="$(printf '%s\n' "${identities}" | sed -nE 's/ *[0-9]+\) ([0-9A-F]{40}) "([^"]*Developer ID Application:[^"]*)".*/\1/p' | head -n 1)"

  if [[ -z "${preferred}" ]]; then
    preferred="$(printf '%s\n' "${identities}" | sed -nE 's/ *[0-9]+\) ([0-9A-F]{40}) "([^"]*Apple Development:[^"]*)".*/\1/p' | head -n 1)"
  fi

  if [[ -n "${preferred}" ]]; then
    printf '%s\n' "${preferred}"
    return 0
  fi

  printf '%s\n' "-"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") [--debug] [--install] [--install-dir <dir>] [--sign <identity>]

Build Meeting Capture as a bundled macOS app with a stable bundle identifier and
entitlements so Screen Recording permission can persist correctly.

Options:
  --debug               Build a debug app instead of release.
  --install             Copy the built app into the install directory after signing.
  --install-dir <dir>   Override the install destination. Default: /Applications
  --sign <identity>     Code signing identity. Default: auto-detect, then ad hoc (-)
  -h, --help            Show this help text.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug)
      CONFIGURATION="debug"
      ;;
    --install)
      INSTALL_APP=1
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift
      ;;
    --sign)
      SIGN_IDENTITY="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -z "${SIGN_IDENTITY}" ]]; then
  SIGN_IDENTITY="$(detect_sign_identity)"
fi

if [[ "${SIGN_IDENTITY}" == "-" ]]; then
  echo "No Apple code signing identity found. Falling back to ad hoc signing."
else
  echo "Using code signing identity: ${SIGN_IDENTITY}"
fi

cd "${PROJECT_DIR}"

swift build -c "${CONFIGURATION}"

BINARY_PATH=".build/arm64-apple-macosx/${CONFIGURATION}/${PRODUCT_NAME}"
INFO_PLIST_PATH="Resources/Info.plist"
ENTITLEMENTS_PATH="MeetingCapture.entitlements"
DIST_DIR="${PROJECT_DIR}/dist"
APP_DIR="${DIST_DIR}/${APP_NAME}"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"

rm -rf "${DIST_DIR}/${LEGACY_APP_NAME}"
rm -rf "${APP_DIR}"
mkdir -p "${MACOS_DIR}"

cp "${BINARY_PATH}" "${MACOS_DIR}/${PRODUCT_NAME}"
cp "${INFO_PLIST_PATH}" "${CONTENTS_DIR}/Info.plist"

/usr/libexec/PlistBuddy -c "Delete :CFBundleExecutable" "${CONTENTS_DIR}/Info.plist" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Add :CFBundleExecutable string ${PRODUCT_NAME}" "${CONTENTS_DIR}/Info.plist" >/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ${APP_BUNDLE_ID}" "${CONTENTS_DIR}/Info.plist" >/dev/null

chmod +x "${MACOS_DIR}/${PRODUCT_NAME}"

codesign --force --sign "${SIGN_IDENTITY}" --entitlements "${ENTITLEMENTS_PATH}" "${MACOS_DIR}/${PRODUCT_NAME}"
codesign --force --deep --sign "${SIGN_IDENTITY}" --entitlements "${ENTITLEMENTS_PATH}" "${APP_DIR}"
codesign --verify --deep --strict --verbose=2 "${APP_DIR}"

echo "Built app bundle at ${APP_DIR}"

if [[ "${INSTALL_APP}" -eq 1 ]]; then
  mkdir -p "${INSTALL_DIR}"
  rm -rf "${INSTALL_DIR}/${LEGACY_APP_NAME}"
  rm -rf "${INSTALL_DIR}/${APP_NAME}"
  cp -R "${APP_DIR}" "${INSTALL_DIR}/${APP_NAME}"
  echo "Installed app bundle at ${INSTALL_DIR}/${APP_NAME}"
fi
