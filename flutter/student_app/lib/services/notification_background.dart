import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Top-level background message handler.
///
/// Required by `firebase_messaging` for notifications received while the
/// app is in the background or terminated. Must be a top-level (non-class)
/// function annotated with `@pragma('vm:entry-point')`.
///
/// Register BEFORE `runApp` in `main.dart`:
///   FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final notification = message.notification;
  final data = message.data;

  debugPrint('[Notification Background] title: ${notification?.title}');
  debugPrint('[Notification Background] data: $data');

  // The system displays the notification automatically.
  // Use this hook for custom logic such as:
  //   - Updating a local unread counter
  //   - Triggering a silent data sync
  //   - Persisting a "missed notification" record
}
