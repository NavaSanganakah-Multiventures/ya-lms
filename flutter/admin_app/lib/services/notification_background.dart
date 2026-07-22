import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

FlutterLocalNotificationsPlugin? _backgroundNotifications;
bool _backgroundNotifInitialized = false;

@pragma('vm:entry-point')
Future<void> adminFirebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final notification = message.notification;
  final data = message.data;

  debugPrint('[AdminNotification Background] title: ${notification?.title}');
  debugPrint('[AdminNotification Background] data: $data');

  if (notification == null && data.isNotEmpty) {
    _backgroundNotifications ??= FlutterLocalNotificationsPlugin();
    if (_backgroundNotifInitialized) {
      // Already initialized, skip duplicate init
    } else {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings();
      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );
      await _backgroundNotifications!.initialize(initSettings);
      _backgroundNotifInitialized = true;
    }

    final androidDetails = AndroidNotificationDetails(
      'admin_lms_default',
      'Admin Notifications',
      channelDescription: 'Admin notifications from Adityanveshan LMS',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    try {
      await _backgroundNotifications!.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        data['title'] ?? 'Adityanveshan Admin',
        data['body'] ?? '',
        details,
        payload: jsonEncode(data),
      );
    } catch (e) {
      debugPrint('[AdminNotification Background] show error: $e');
    }
  }
}
