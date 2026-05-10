# Build Student APK from GitHub Actions

The repository includes a manual-only workflow named **Build Student Flutter APK** for quickly creating APKs for live testing. It does not run automatically on push or pull request.

## Manual build

1. Open GitHub → **Actions**.
2. Select **Build Student Flutter APK**.
3. Click **Run workflow**.
4. Choose a build mode:
   - `debug` for fastest live testing.
   - `release` for a smaller release-style APK.
   - `both` to generate both APKs.
5. After the workflow finishes, download the APK from the **Artifacts** section.

## What the workflow does

The workflow runs from `flutter/student_app` and performs:

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug   # default for live testing
flutter build apk --release # only when selected manually
```

The generated APKs are uploaded as a GitHub Actions artifact named `student-app-apk-<run_number>` and retained for 14 days.

## Notes

- The current Android release build uses the debug signing config from `android/app/build.gradle.kts`, so it is suitable for internal/live testing, not Play Store production signing.
- Use the workflow input `flutter_version` only when you need to pin a specific Flutter SDK version.
