import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

typedef ForegroundNotificationHandler = void Function(
  String title,
  String body,
  Map<String, dynamic> data,
);

typedef NotificationTapHandler = void Function(
  String url,
  Map<String, dynamic> data,
);

class AdminNotificationService {
  AdminNotificationService._();
  static final AdminNotificationService instance = AdminNotificationService._();

  static const String _deviceIdKey = 'admin_device_id';

  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://lms.yagyaashram.com',
  );

  FirebaseMessaging? _messaging;
  String? _deviceId;
  String? _fcmToken;
  String? _apnsToken;

  bool _initialized = false;

  ForegroundNotificationHandler? _onForeground;
  NotificationTapHandler? _onTap;
  final List<Map<String, dynamic>> _pendingTaps = [];

  FlutterLocalNotificationsPlugin? _localNotifications;

  String? get deviceId => _deviceId;
  String? get fcmToken => _fcmToken;
  String? get apnsToken => _apnsToken;

  Future<void> init() async {
    if (_initialized) return;

    try {
      _messaging = FirebaseMessaging.instance;
      await _ensureDeviceId();
      await _initLocalNotifications();
      await _requestPermission();
      await _refreshToken();
      _retrieveAPNSToken();
      _listenForTokenRefresh();
      _setupTapHandlers();
      _listenForegroundMessages();
      _initialized = true;
    } catch (e) {
      debugPrint('[AdminNotification] init error: $e');
    }
  }

  Future<void> _initLocalNotifications() async {
    _localNotifications = FlutterLocalNotificationsPlugin();
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    await _localNotifications!.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        if (response.payload != null) {
          try {
            final data = jsonDecode(response.payload!) as Map<String, dynamic>;
            final url = (data['url'] ?? data['clickUrl'] ?? '/admin') as String;
            _onTap?.call(url, data);
          } catch (_) {}
        }
      },
    );
  }

  void setOnForeground(ForegroundNotificationHandler handler) {
    _onForeground = handler;
  }

  void setOnTap(NotificationTapHandler handler) {
    _onTap = handler;
    // Process any pending tap notifications
    for (final pending in _pendingTaps) {
      final url = pending['url'] as String;
      final data = pending['data'] as Map<String, dynamic>;
      _onTap?.call(url, data);
    }
    _pendingTaps.clear();
  }

  void _listenForegroundMessages() {
    if (_messaging == null) return;
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
  }

  Future<void> _ensureDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    _deviceId = prefs.getString(_deviceIdKey);
    if (_deviceId == null) {
      _deviceId = const Uuid().v4();
      await prefs.setString(_deviceIdKey, _deviceId!);
    }
  }

  Future<void> _requestPermission() async {
    if (_messaging == null) return;

    if (defaultTargetPlatform == TargetPlatform.iOS) {
      final settings = await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: true,
      );
      debugPrint('[AdminNotification] iOS permission: ${settings.authorizationStatus}');
    } else {
      final settings = await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      debugPrint('[AdminNotification] permission: ${settings.authorizationStatus}');
    }
  }

  Future<void> _refreshToken() async {
    if (_messaging == null) return;
    try {
      _fcmToken = await _messaging!.getToken();
      if (_fcmToken != null) {
        await _registerDevice();
      }
    } catch (e) {
      debugPrint('[AdminNotification] getToken error: $e');
    }
  }

  Future<void> _retrieveAPNSToken() async {
    if (_messaging == null) return;
    try {
      _apnsToken = await _messaging!.getAPNSToken();
      if (_apnsToken != null) {
        debugPrint('[AdminNotification] APNs token: $_apnsToken');
      }
    } catch (e) {
      debugPrint('[AdminNotification] getAPNSToken error: $e');
    }
  }

  void _listenForTokenRefresh() {
    if (_messaging == null) return;
    _messaging!.onTokenRefresh.listen((newToken) {
      _fcmToken = newToken;
      _registerDevice();
    });
  }

  void _setupTapHandlers() {
    if (_messaging == null) return;
    _messaging!.getInitialMessage().then(_handleTap);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);
  }

  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;
    if (notification != null) {
      _onForeground?.call(
        notification.title ?? 'Adityanveshan Admin',
        notification.body ?? '',
        Map<String, dynamic>.from(data),
      );
    }

    _showLocalNotification(notification, data);
  }

  Future<void> _showLocalNotification(
    RemoteNotification? notification,
    Map<String, dynamic> data,
  ) async {
    if (_localNotifications == null || notification == null) return;

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

    await _localNotifications!.show(
      notification.hashCode,
      notification.title ?? 'Adityanveshan Admin',
      notification.body ?? '',
      details,
      payload: jsonEncode(data),
    );
  }

  void _handleTap(RemoteMessage? message) {
    if (message == null) return;
    final data = Map<String, dynamic>.from(message.data);
    // Route admin notification taps to relevant sections
    final section = data['section'] ?? 'dashboard';
    String url;
    switch (section) {
      case 'courses':
        url = '/admin/courses';
        break;
      case 'users':
        url = '/admin/users';
        break;
      case 'broadcast':
        url = '/admin/broadcast';
        break;
      default:
        url = data['url'] ?? data['clickUrl'] ?? '/admin';
    }
    if (_onTap != null) {
      _onTap!.call(url, data);
    } else {
      // Queue for later processing
      _pendingTaps.add({'url': url, 'data': data});
    }
  }

  String _detectPlatform() {
    if (kIsWeb) return 'flutter_web';
    try {
      if (Platform.isAndroid) return 'flutter_android';
      if (Platform.isIOS) return 'flutter_ios';
    } catch (_) {}
    return 'flutter_web';
  }

  Future<bool> _registerDevice() async {
    if (_fcmToken == null || _deviceId == null) return false;
    try {
      final body = jsonEncode({
        'fcm_token': _fcmToken,
        'platform': _detectPlatform(),
        'device_id': _deviceId,
        'user_agent': 'Flutter/${_detectPlatform()}',
      });

      final path = '/api/notifications/register-device';
      final res = await http
          .post(
            Uri.parse('$_apiBaseUrl$path'),
            headers: {'Content-Type': 'application/json'},
            body: body,
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        debugPrint('[AdminNotification] device registered');
        return true;
      }
      debugPrint('[AdminNotification] register failed: ${res.statusCode}');
      return false;
    } catch (e) {
      debugPrint('[AdminNotification] register error: $e');
      return false;
    }
  }
}
