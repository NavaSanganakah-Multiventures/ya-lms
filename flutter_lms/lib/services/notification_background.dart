import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Top-level background message handler.
/// Flutter requires this to be a top-level function (NOT inside a class).
///
/// Register in main.dart:
///   FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final notification = message.notification;
  final data = message.data;

  debugPrint('[Notification Background] Title: ${notification?.title}');
  debugPrint('[Notification Background] Data: $data');

  // Note: System already shows the notification automatically.
  // This handler is for custom logic like:
  // - Updating local database
  // - Syncing with backend
  // - Updating badge count

  // Future: Update notification badge count via SharedPreferences
  // Future: Trigger local data sync
}
