# Flutter App Setup — Firebase Cloud Messaging

> Adityanveshan LMS — Student App
> Last updated: 2026-06-01

यह document बताता है कि `flutter/student_app` में FCM push notifications कैसे enable करें।

---

## ✅ Code changes (done)

| File | Status | Purpose |
|------|--------|---------|
| `flutter/student_app/pubspec.yaml` | ✅ Updated | Added `firebase_core`, `firebase_messaging`, `uuid` |
| `flutter/student_app/lib/main.dart` | ✅ Updated | Firebase init + background handler + service init |
| `flutter/student_app/lib/services/notification_service.dart` | ✅ New | Full service: FCM token, device ID, register/associate, foreground/tap handlers |
| `flutter/student_app/lib/services/notification_background.dart` | ✅ New | Top-level background handler |
| `flutter/student_app/lib/providers/auth_provider.dart` | ✅ Updated | Calls `NotificationService.onLogin()` after OTP verify |
| `flutter/student_app/android/app/src/main/AndroidManifest.xml` | ✅ Updated | Added `POST_NOTIFICATIONS` + `WAKE_LOCK` permissions |

---

## 📥 Manual Steps Required (आपको करने हैं)

### Step 1: Firebase Console पर Android app add करें

1. https://console.firebase.google.com/ पर जाएँ
2. अपना project select करें (वही जो `/api/firebase/config` से serve हो रहा है)
3. **Project Settings** (gear icon) → **General** tab → **Your apps** section
4. **Android** icon click करें
5. Fill details:
   - **Android package name**: `com.yagyaashram.lms` (यह `android/app/build.gradle.kts` में `applicationId` से match होना चाहिए)
   - **App nickname**: `Adityanveshan Student`
   - **Debug signing certificate SHA-1**: (optional, leave blank for now)
6. **Register app** click करें
7. **`google-services.json` download** करें
8. File को `flutter/student_app/android/app/google-services.json` पर रखें

### Step 2: Firebase Console पर iOS app add करें

1. Same Firebase project → **Add app** → **iOS**
2. Fill details:
   - **iOS bundle ID**: `com.yagyaashram.lms` (Runner target से match करना चाहिए)
   - **App nickname**: `Adityanveshan Student iOS`
3. **Register app** click करें
4. **`GoogleService-Info.plist` download** करें
5. File को `flutter/student_app/ios/Runner/GoogleService-Info.plist` पर रखें
6. **Xcode में add करना न भूलें**: `ios/Runner.xcodeproj` open करें → `Runner` folder पर right-click → "Add Files to Runner..." → `GoogleService-Info.plist` select करें

### Step 3: iOS — APNs key upload to Firebase

iOS पर push notifications काम करने के लिए APNs key ज़रूरी है:

1. https://developer.apple.com/account/ → Certificates, Identifiers & Profiles
2. **Keys** tab → "+" icon → "Apple Push Notifications service (APNs)" enable करें
3. Key name दें, **Continue** → **Register** → **Download** करें (`.p8` file, सिर्फ एक बार download होती है)
4. **Key ID** और **Team ID** note करें
5. Firebase Console → **Project Settings** → **Cloud Messaging** tab
6. **iOS app configuration** section → **APNs authentication key** upload:
   - **APNs key**: `.p8` file upload
   - **Key ID**: ऊपर से
   - **Team ID**: ऊपर से
7. **Save** करें

### Step 4: iOS — Capabilities (Xcode)

Xcode में `Runner.xcodeproj` open करें:

1. **Runner** target → **Signing & Capabilities** tab
2. **+ Capability** → **Push Notifications** add करें
3. **+ Capability** → **Background Modes** add करें
   - ☑ **Background fetch**
   - ☑ **Remote notifications**

### Step 5: iOS — Info.plist

`flutter/student_app/ios/Runner/Info.plist` में push permission description add करें (already नहीं है तो):

```xml
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>remote-notification</string>
</array>
```

### Step 6: iOS — Podfile minimum iOS version

`flutter/student_app/ios/Podfile` में iOS deployment target ≥ 13.0 होना चाहिए (firebase_messaging requirement):

```ruby
platform :ios, '13.0'
```

---

## 🧪 Testing

### Local test (Android emulator):

```bash
cd flutter/student_app
flutter pub get
flutter run --dart-define=API_BASE_URL=https://lms.yagyaashram.com
```

App start होने पर:
1. Notification permission prompt आएगा
2. Allow करें
3. Logcat में `[Notification] device registered` दिखेगा
4. Cloudflare Worker के database में (D1) `PushSubscriptions` table में नई entry दिखेगी

### Cloud Function से push भेजें (test):

Cloudflare Worker `/api/notifications/send` endpoint use करें:

```bash
curl -X POST https://lms.yagyaashram.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Cookie: lms_session=YOUR_ADMIN_COOKIE" \
  -d '{
    "audience": "all",
    "title": "Test Push",
    "body": "Hello from Cloudflare!"
  }'
```

### Background handler verify करें:

App को background में भेजें (home button), फिर server से push भेजें — logcat में:
```
[Notification Background] title: Test Push
[Notification Background] data: {...}
```

---

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| `No Firebase App '[DEFAULT]'` | `google-services.json` सही path पर है verify करें, `flutter clean` करें |
| `MissingPluginException` | `flutter pub get` और `flutter clean` → `flutter run` |
| iOS पर push नहीं आ रहा | APNs key Firebase में upload है? Real device पर test कर रहे हैं? Simulator पर push काम नहीं करता |
| Token null आ रहा है | Google Play Services available है? Real device पर test करें |
| `Platform.isAndroid` not found | `dart:io` import है, `kIsWeb` check है? |

---

## 📋 Pre-flight Checklist (deploy से पहले)

- [ ] `google-services.json` (Android) — Firebase Console से downloaded और `android/app/` में placed
- [ ] `GoogleService-Info.plist` (iOS) — Firebase Console से downloaded, Xcode में added
- [ ] APNs key Firebase में uploaded
- [ ] `POST_NOTIFICATIONS` permission (AndroidManifest) — ✅ added
- [ ] `UIBackgroundModes` (Info.plist) — added
- [ ] `ios/Runner.entitlements` में `aps-environment` — added (automatic with Push Notifications capability)
- [ ] Bundle ID Firebase + Xcode में match — `com.yagyaashram.lms`
- [ ] `API_BASE_URL` dart-define set है build command में
- [ ] Test push from admin UI → device पर आ रहा है
- [ ] Login के बाद `AnonymousUsers.converted_to_user_id` set हो रहा है (D1 check)

---

## 📱 Build Commands

```bash
# Android APK
flutter build apk --release \
  --dart-define=API_BASE_URL=https://lms.yagyaashram.com

# Android App Bundle (Play Store)
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://lms.yagyaashram.com

# iOS
flutter build ios --release \
  --dart-define=API_BASE_URL=https://lms.yagyaashram.com
```
