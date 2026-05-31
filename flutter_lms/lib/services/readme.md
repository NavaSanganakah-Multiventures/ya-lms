# Flutter Push Notification Integration

## Files Overview

| File | Purpose |
|------|---------|
| `services/notification_service.dart` | Main notification service — FCM init, token register, user associate, foreground handler, tap handler |
| `services/notification_background.dart` | Top-level background message handler (required by Flutter) |
| `main.dart` | App entry — Firebase init, notification init, callback setup |

## Setup Steps

### 1. Add dependencies to `pubspec.yaml`

```yaml
dependencies:
  firebase_core: ^3.12.0
  firebase_messaging: ^15.2.0
  http: ^1.3.0
  shared_preferences: ^2.5.0
```

### 2. Firebase project setup

- **Android**: `google-services.json` in `android/app/`
- **iOS**: `GoogleService-Info.plist` in `ios/Runner/`
- **Web**: Firebase config in `web/index.html`

### 3. Update `main.dart`

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'services/notification_background.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  await NotificationService().init();
  runApp(const MyApp());
}
```

### 4. Login/Logout integration

```dart
// On login success:
await NotificationService().onLogin(jwtToken);

// On logout:
await NotificationService().onLogout();
```

## API Contract (Backend — already implemented)

The Flutter app calls 3 endpoints from the existing backend:

| Method | Endpoint | When |
|--------|----------|------|
| `POST` | `/api/notifications/register-device` | App start (auto) |
| `PUT` | `/api/notifications/associate-user` | Login success |
| `DELETE` | `/api/notifications/unregister-device` | Logout |

### Request format

```json
// POST /api/notifications/register-device
{
  "fcm_token": "fcm-token-from-firebase-sdk",
  "platform": "flutter_android",
  "device_id": "unique-device-uuid",
  "user_agent": "Flutter/android"
}

// PUT /api/notifications/associate-user
{
  "device_id": "unique-device-uuid"
}

// DELETE /api/notifications/unregister-device
{
  "device_id": "unique-device-uuid"
}
```

## How it works

```
App install → FCM token → POST /register-device (user_id = null)
                                                    ↓
User login → PUT /associate-user → user_id linked to device
                                                    ↓
Backend sendPush() → FCM API → Notification on device
```
