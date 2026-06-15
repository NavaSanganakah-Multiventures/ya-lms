import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

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

  // The system displays the notification automatically when a notification
  // payload is present. For data-only messages, show a local notification.
  if (notification == null && data.isNotEmpty) {
    final localNotifications = FlutterLocalNotificationsPlugin();
    const androidSettings = AndroidInitializationSettings('@mipmap/launcher_icon');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    await localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        debugPrint('[Notification Tap] payload: ${response.payload}');
      },
    );

    final androidDetails = AndroidNotificationDetails(
      'lms_default',
      'Adityanveshan Notifications',
      channelDescription: 'Notifications from Adityanveshan LMS',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.hashCode,
      data['title'] ?? 'Adityanveshan',
      data['body'] ?? '',
      details,
      payload: jsonEncode(data),
    );
  }

  // Use this hook for custom logic such as:
  //   - Updating a local unread counter
  //   - Triggering a silent data sync
  //   - Persisting a "missed notification" record
}
