#!/usr/bin/env bash
set -euo pipefail

# Installs the Flutter CLI for this repository without committing the SDK.
# Default location is outside the repo so the SDK does not pollute git status.
INSTALL_DIR="${FLUTTER_INSTALL_DIR:-/opt/flutter}"
RELEASES_JSON_URL="${FLUTTER_RELEASES_JSON_URL:-https://storage.googleapis.com/flutter_infra_release/releases/releases_linux.json}"
TMP_DIR="${TMPDIR:-/tmp}/flutter-cli-install"

if command -v flutter >/dev/null 2>&1; then
  echo "Flutter already available: $(command -v flutter)"
  flutter --version
  exit 0
fi

if [ -x "${INSTALL_DIR}/bin/flutter" ]; then
  export PATH="${INSTALL_DIR}/bin:${PATH}"
  echo "Flutter already installed in ${INSTALL_DIR}"
  flutter --version
  exit 0
fi

mkdir -p "${TMP_DIR}"

if [ -n "${FLUTTER_ARCHIVE_URL:-}" ]; then
  ARCHIVE_URL="${FLUTTER_ARCHIVE_URL}"
elif [ -n "${FLUTTER_VERSION:-}" ]; then
  ARCHIVE_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"
else
  RELEASES_JSON="${TMP_DIR}/releases_linux.json"
  echo "Resolving latest stable Flutter release from ${RELEASES_JSON_URL}"
  if ! curl -fL --retry 3 --retry-delay 5 -o "${RELEASES_JSON}" "${RELEASES_JSON_URL}"; then
    cat >&2 <<MSG
Unable to fetch Flutter release metadata from the official archive.
Retry on a network that allows storage.googleapis.com, or provide an explicit archive URL:

  FLUTTER_ARCHIVE_URL="https://.../flutter_linux_<version>-stable.tar.xz" ./tool/install_flutter_cli.sh

You can also set FLUTTER_VERSION=<version> to use the official Google Storage URL.
MSG
    exit 22
  fi
  ARCHIVE_URL="$(python3 - "${RELEASES_JSON}" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as fh:
    data = json.load(fh)
stable_hash = data['current_release']['stable']
release = next(item for item in data['releases'] if item['hash'] == stable_hash)
print('https://storage.googleapis.com/flutter_infra_release/releases/' + release['archive'])
PY
)"
fi

ARCHIVE_PATH="${TMP_DIR}/flutter.tar.xz"
echo "Downloading Flutter from ${ARCHIVE_URL}"
curl -fL --retry 3 --retry-delay 5 -o "${ARCHIVE_PATH}" "${ARCHIVE_URL}"

echo "Installing Flutter into ${INSTALL_DIR}"
rm -rf "${INSTALL_DIR}"
mkdir -p "$(dirname "${INSTALL_DIR}")"
tar -xJf "${ARCHIVE_PATH}" -C "$(dirname "${INSTALL_DIR}")"

# The official archive extracts to a directory named 'flutter'. Move it only if a custom
# FLUTTER_INSTALL_DIR was requested.
EXTRACTED_DIR="$(dirname "${INSTALL_DIR}")/flutter"
if [ "${EXTRACTED_DIR}" != "${INSTALL_DIR}" ]; then
  rm -rf "${INSTALL_DIR}"
  mv "${EXTRACTED_DIR}" "${INSTALL_DIR}"
fi

export PATH="${INSTALL_DIR}/bin:${PATH}"
flutter config --no-analytics
flutter --version

echo
cat <<MSG
Flutter CLI installed.
For this shell, run:
  export PATH="${INSTALL_DIR}/bin:\$PATH"
MSG
