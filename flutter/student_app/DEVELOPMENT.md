# Student Flutter App Development

Use the helper scripts in `tool/` to keep Flutter setup and verification consistent.

## Install Flutter CLI

```bash
./tool/install_flutter_cli.sh
export PATH="/opt/flutter/bin:$PATH"
```

The installer keeps the Flutter SDK outside this repository by default (`/opt/flutter`) and resolves the latest official stable Linux archive from Flutter release metadata. You can override the version, archive URL, or install path:

```bash
FLUTTER_VERSION=3.35.7 FLUTTER_INSTALL_DIR="$HOME/flutter" ./tool/install_flutter_cli.sh
export PATH="$HOME/flutter/bin:$PATH"

# Or use a mirror / pre-downloaded official archive URL if storage.googleapis.com is blocked:
FLUTTER_ARCHIVE_URL="https://example.com/flutter_linux_<version>-stable.tar.xz" ./tool/install_flutter_cli.sh
```

## Run the student app for live testing

```bash
./tool/run_student_app.sh

# Optional: target a specific device id from `flutter devices`
FLUTTER_DEVICE=chrome ./tool/run_student_app.sh
```

The run script installs Flutter if needed, runs `flutter pub get`, prints available devices, and starts `flutter run`.

## Verify the student app

```bash
./tool/test_student_app.sh
```

This runs:

1. `flutter pub get`
2. `dart format lib test`
3. `flutter analyze`
4. `flutter test`

If the CLI is missing, the verification script installs it first.

## Custom API Base URL via Dart Define

To run the app pointing to a different API server (local Next.js dev or remote), use the `--dart-define=API_BASE_URL` flag:

### Local Next.js Development Server
```bash
./tool/run_student_app.sh --dart-define=API_BASE_URL=http://10.0.2.2:3000
# or for iOS simulator:
./tool/run_student_app.sh --dart-define=API_BASE_URL=http://localhost:3000
# or for web:
./tool/run_student_app.sh --dart-define=API_BASE_URL=http://localhost:3000
```

### Remote Server
```bash
./tool/run_student_app.sh --dart-define=API_BASE_URL=https://staging.yagyaashram.com
```

If no `--dart-define=API_BASE_URL` is provided, the app defaults to the embedded logic (production domain, or local emulator/simulator based on build mode).

