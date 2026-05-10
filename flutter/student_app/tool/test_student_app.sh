#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLUTTER_BIN="${FLUTTER_BIN:-flutter}"
DART_BIN="${DART_BIN:-dart}"

if ! command -v "${FLUTTER_BIN}" >/dev/null 2>&1; then
  "${SCRIPT_DIR}/install_flutter_cli.sh"
  export PATH="${FLUTTER_INSTALL_DIR:-/opt/flutter}/bin:${PATH}"
  FLUTTER_BIN="flutter"
  DART_BIN="dart"
fi

cd "${APP_DIR}"
"${FLUTTER_BIN}" pub get
"${DART_BIN}" format lib test
"${FLUTTER_BIN}" analyze
"${FLUTTER_BIN}" test
