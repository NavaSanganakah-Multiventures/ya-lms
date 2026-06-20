import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'api_service.dart';

typedef ForegroundNotificationHandler = void Function(
  String title,
  String body,
  Map<String, dynamic> data,
);

typedef NotificationTapHandler = void Function(
  String url,
  Map<String, dynamic> data,
);

class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  static const String _deviceIdKey = 'lms_device_id';


  // API base URL — pass via --dart-define=API_BASE_URL=https://api.yagyaashram.com
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

  FlutterLocalNotificationsPlugin? _localNotifications;

  String? get deviceId => _deviceId;
  String? get fcmToken => _fcmToken;
  String? get apnsToken => _apnsToken;

  /// Call once at app startup (after Firebase.initializeApp).
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      _messaging = FirebaseMessaging.instance;
      await _ensureDeviceId();
      await _initLocalNotifications();
      await _requestPermission();
      await _refreshToken();
      _retrieveAPNSToken();
      _listenForTokenRefresh();
      _setupTapHandlers();
    } catch (e) {
      debugPrint('[Notification] init error: $e');
    }
  }

  Future<void> _initLocalNotifications() async {
    _localNotifications = FlutterLocalNotificationsPlugin();
    const androidSettings = AndroidInitializationSettings('@mipmap/launcher_icon');
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
        // Forward local notification taps
        if (response.payload != null) {
          try {
            final data = jsonDecode(response.payload!) as Map<String, dynamic>;
            final url = (data['url'] ?? data['clickUrl'] ?? '/dashboard') as String;
            _onTap?.call(url, data);
          } catch (_) {}
        }
      },
    );
  }

  void setOnForeground(ForegroundNotificationHandler handler) {
    _onForeground = handler;
    if (_messaging == null) return;
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
  }

  void setOnTap(NotificationTapHandler handler) {
    _onTap = handler;
  }

  /// Call after a successful login. The auth cookie is already stored
  /// in SharedPreferences by `api_service._updateCookie` — we just need
  /// to reload it and re-register the device so the backend picks up
  /// the authenticated user.
  Future<void> onLogin() async {
    await _registerDevice();
  }

  /// Call on logout. We keep the FCM token registered but clear the
  /// local cookie reference. The backend will treat the device as
  /// anonymous again on the next broadcast until a fresh login.
  Future<void> onLogout() async {
    // Optionally re-register without auth to demote device to anonymous
    await _registerDevice();
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
      // iOS: request provisional permission for a soft-ask experience
      final settings = await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: true,
      );
      debugPrint('[Notification] iOS permission: ${settings.authorizationStatus}');
    } else {
      final settings = await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint('[Notification] permission: ${settings.authorizationStatus}');
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
      debugPrint('[Notification] getToken error: $e');
    }
  }

  Future<void> _retrieveAPNSToken() async {
    if (_messaging == null) return;
    try {
      _apnsToken = await _messaging!.getAPNSToken();
      if (_apnsToken != null) {
        final redactedToken = _apnsToken!.length > 8
            ? '...${_apnsToken!.substring(_apnsToken!.length - 8)}'
            : '***';
        debugPrint('[Notification] APNs token received (suffix: $redactedToken)');
      }
    } catch (e) {
      debugPrint('[Notification] getAPNSToken error: $e');
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
        notification.title ?? 'Adityanveshan',
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

    await _localNotifications!.show(
      notification.hashCode,
      notification.title ?? 'Adityanveshan',
      notification.body ?? '',
      details,
      payload: jsonEncode(data),
    );
  }

  void _handleTap(RemoteMessage? message) {
    if (message == null) return;
    final data = Map<String, dynamic>.from(message.data);
    final url = (data['url'] ?? data['clickUrl'] ?? '/dashboard') as String;
    _onTap?.call(url, data);
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
            headers: await ApiService.getHeaders(),
            body: body,
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        debugPrint('[Notification] device registered');
        return true;
      }
      debugPrint('[Notification] register failed: ${res.statusCode}');
      return false;
    } catch (e) {
      debugPrint('[Notification] register error: $e');
      return false;
    }
  }
}
