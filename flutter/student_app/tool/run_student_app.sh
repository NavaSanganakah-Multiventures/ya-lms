#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLUTTER_BIN="${FLUTTER_BIN:-flutter}"

if ! command -v "${FLUTTER_BIN}" >/dev/null 2>&1; then
  "${SCRIPT_DIR}/install_flutter_cli.sh"
  export PATH="${FLUTTER_INSTALL_DIR:-/opt/flutter}/bin:${PATH}"
  FLUTTER_BIN="flutter"
fi

cd "${APP_DIR}"
"${FLUTTER_BIN}" pub get
"${FLUTTER_BIN}" devices

if [ -n "${FLUTTER_DEVICE:-}" ]; then
  exec "${FLUTTER_BIN}" run -d "${FLUTTER_DEVICE}" "$@"
fi

exec "${FLUTTER_BIN}" run "$@"
