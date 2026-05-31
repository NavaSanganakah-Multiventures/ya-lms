import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;
  NotificationService._();

  static const String _deviceIdKey = 'lms_device_id';
  static const String _baseUrl = 'https://yourdomain.com'; // TODO: Replace with your domain

  late final FirebaseMessaging _messaging;
  String? _deviceId;
  String? _fcmToken;
  String? _jwtToken;

  // --- Public Methods ---

  Future<void> init() async {
    _messaging = FirebaseMessaging.instance;
    await _requestPermission();
    await _initDeviceId();
    await _refreshToken();
    _listenForTokenRefresh();
    _setupForegroundHandler();
    _setupNotificationTapHandler();
  }

  /// Call after successful login
  Future<void> onLogin(String jwtToken) async {
    _jwtToken = jwtToken;
    await _associateUser();
  }

  /// Call on logout
  Future<void> onLogout() async {
    await _unregisterDevice();
    _jwtToken = null;
  }

  // --- Permission ---

  Future<void> _requestPermission() async {
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('[Notification] Permission denied');
    }
  }

  // --- Device ID ---

  Future<void> _initDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    _deviceId = prefs.getString(_deviceIdKey);
    if (_deviceId == null) {
      _deviceId = _generateUUID();
      await prefs.setString(_deviceIdKey, _deviceId!);
    }
  }

  String _generateUUID() {
    // Simple UUID v4
    final now = DateTime.now().millisecondsSinceEpoch;
    final random = (now % 1000000).toString();
    return 'flutter_${now}_${random}_${_randomString(8)}';
  }

  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final result = List.generate(length, (_) => chars[DateTime.now().microsecond % chars.length]);
    return result.join();
  }

  // --- FCM Token ---

  Future<void> _refreshToken() async {
    _fcmToken = await _messaging.getToken();
    if (_fcmToken != null) {
      await _registerDevice();
    }
  }

  void _listenForTokenRefresh() {
    _messaging.onTokenRefresh.listen((newToken) {
      debugPrint('[Notification] Token refreshed');
      _fcmToken = newToken;
      _registerDevice();
    });
  }

  // --- API Calls ---

  /// POST /api/notifications/register-device
  Future<bool> _registerDevice() async {
    if (_fcmToken == null || _deviceId == null) return false;

    try {
      final body = {
        'fcm_token': _fcmToken,
        'platform': _detectPlatform(),
        'device_id': _deviceId,
        'user_agent': 'Flutter/${defaultTargetPlatform.name}',
      };

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (_jwtToken != null) {
        headers['Authorization'] = 'Bearer $_jwtToken';
      }

      final res = await http.post(
        Uri.parse('$_baseUrl/api/notifications/register-device'),
        headers: headers,
        body: jsonEncode(body),
      );

      if (res.statusCode == 200) {
        debugPrint('[Notification] Device registered');
        return true;
      }
      debugPrint('[Notification] Register failed: ${res.statusCode}');
      return false;
    } catch (e) {
      debugPrint('[Notification] Register error: $e');
      return false;
    }
  }

  /// PUT /api/notifications/associate-user
  Future<bool> _associateUser() async {
    if (_deviceId == null || _jwtToken == null) return false;

    try {
      final res = await http.put(
        Uri.parse('$_baseUrl/api/notifications/associate-user'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_jwtToken',
        },
        body: jsonEncode({'device_id': _deviceId}),
      );

      if (res.statusCode == 200) {
        debugPrint('[Notification] User associated with device');
        return true;
      }
      debugPrint('[Notification] Associate failed: ${res.statusCode}');
      return false;
    } catch (e) {
      debugPrint('[Notification] Associate error: $e');
      return false;
    }
  }

  /// DELETE /api/notifications/unregister-device
  Future<bool> _unregisterDevice() async {
    if (_deviceId == null) return false;

    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (_jwtToken != null) {
        headers['Authorization'] = 'Bearer $_jwtToken';
      }

      final res = await http.delete(
        Uri.parse('$_baseUrl/api/notifications/unregister-device'),
        headers: headers,
        body: jsonEncode({'device_id': _deviceId}),
      );

      if (res.statusCode == 200) {
        debugPrint('[Notification] Device unregistered');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[Notification] Unregister error: $e');
      return false;
    }
  }

  // --- Platform Detection ---

  String _detectPlatform() {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'flutter_android';
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      return 'flutter_ios';
    }
    return 'flutter_web';
  }

  // --- Foreground Messages ---

  void _setupForegroundHandler() {
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
  }

  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      debugPrint('[Notification] Foreground: ${notification.title}');
      // TODO: Show in-app notification/snackbar/dialog
      // onNotificationReceived callback trigger karein
      _onForegroundNotification?.call(
        notification.title ?? '',
        notification.body ?? '',
        data,
      );
    }
  }

  /// Callback for UI to show in-app notification
  void Function(String title, String body, Map<String, String> data)? _onForegroundNotification;

  void setOnForegroundNotification(
    void Function(String title, String body, Map<String, String> data) callback,
  ) {
    _onForegroundNotification = callback;
  }

  // --- Notification Tap (App opened from notification) ---

  void _setupNotificationTapHandler() {
    // App opened from terminated state
    _messaging.getInitialMessage().then(_handleNotificationTap);
    // App opened from background state
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);
  }

  void _handleNotificationTap(RemoteMessage? message) {
    if (message == null) return;

    final data = message.data;
    final clickUrl = data['clickUrl'];

    debugPrint('[Notification] Tap: clickUrl=$clickUrl');

    // TODO: Navigate to the URL
    // Use GoRouter or Navigator to push route
    _onNotificationTap?.call(clickUrl ?? '/dashboard', data);
  }

  /// Callback for navigation on notification tap
  void Function(String url, Map<String, String> data)? _onNotificationTap;

  void setOnNotificationTap(
    void Function(String url, Map<String, String> data) callback,
  ) {
    _onNotificationTap = callback;
  }
}
