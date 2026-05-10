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
5. After the workflow finishes, the APK is committed back into `flutter/student_app/apk/` in this repository.

## What the workflow does

The workflow runs from `flutter/student_app` and performs:

```bash
flutter pub get
flutter analyze            # warnings are shown in logs but do not block APK generation
flutter test               # skipped automatically when no test/**/*.dart files exist
flutter build apk --debug   # default for live testing
flutter build apk --release # only when selected manually
```

The generated APKs are copied into `flutter/student_app/apk/` with the GitHub Actions run number in the file name, then committed and pushed back to the same branch using `GITHUB_TOKEN`. No GitHub Actions artifact upload is used. If the workflow still fails, open the failed step logs and share the exact error line so the build issue can be fixed directly.

## Notes

- The current Android release build uses the debug signing config from `android/app/build.gradle.kts`, so it is suitable for internal/live testing, not Play Store production signing.
- Use the workflow input `flutter_version` only when you need to pin a specific Flutter SDK version.


## Repository APK output

APK files are saved in:

```text
flutter/student_app/apk/
```

Example file names:

```text
student-app-123-app-debug.apk
student-app-123-app-release.apk
```
