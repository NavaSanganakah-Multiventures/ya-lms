import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'integrity_service.dart';
import '../utils/signature_util.dart';

class ApiService {
  static const _storage = FlutterSecureStorage();
  static const _cookieKey = 'session_cookie';

  static const String _envApiBase = String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static String get baseUrl {
    if (_envApiBase.isNotEmpty) return _envApiBase;
    return 'https://lms.yagyaashram.com';
  }

  // Callback triggered on 401/403 — AuthProvider should set this
  static void Function()? onUnauthorized;

  /// Expose the shared Dio instance for use by other services
  static Dio get dio => _dio;

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AdityanveshanApp/1.0',
      },
      validateStatus: (_) => true,
    ),
  )..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        try {
          final cookie = await getSessionCookie();
          if (cookie.isNotEmpty) {
            options.headers['Cookie'] = cookie;
          }
          // Add App-JWT from Play Integrity
          final appJwt = await IntegrityService.getAppJwt();
          if (appJwt != null && appJwt.isNotEmpty) {
            options.headers['X-App-JWT'] = appJwt;
          }
          final sigHeaders = SignatureUtil.generateSignatureHeaders(
            options.method.toUpperCase(), options.path,
          );
          options.headers.addAll(sigHeaders);
        } on StateError catch (e) {
          debugPrint('[ApiService] signature error: $e');
          return handler.reject(
            DioException(requestOptions: options, error: e, type: DioExceptionType.unknown),
          );
        } catch (e) {
          debugPrint('[ApiService] onRequest error: $e');
          return handler.reject(
            DioException(requestOptions: options, error: e, type: DioExceptionType.unknown),
          );
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        try {
          await _updateCookie(response);
        } catch (e) {
          debugPrint('[ApiService] _updateCookie error: $e');
        }
        try {
          if (response.statusCode == 401 || response.statusCode == 403) {
            _clearSessionAndNotify();
          }
        } catch (e) {
          debugPrint('[ApiService] onResponse error: $e');
        }
        return handler.next(response);
      },
      onError: (error, handler) async {
        try {
          if (error.response?.statusCode == 401 || error.response?.statusCode == 403) {
            _clearSessionAndNotify();
          }
        } catch (e) {
          debugPrint('[ApiService] onError error: $e');
        }
        return handler.next(error);
      },
    ));

  static void _clearSessionAndNotify() {
    clearSession();
    final callback = onUnauthorized;
    callback?.call();
  }

  // --- Cookie methods ---

  static Future<String> getSessionCookie() async {
    return await _storage.read(key: _cookieKey) ?? '';
  }

  static Future<String?> getSessionCookieValue() async {
    final cookie = await getSessionCookie();
    if (cookie.isEmpty || !cookie.contains('=')) return null;
    return cookie.substring(cookie.indexOf('=') + 1);
  }

  static Future<void> clearSession() async {
    await _storage.delete(key: _cookieKey);
  }

  static Future<void> _updateCookie(Response response) async {
    try {
      final rawCookies = response.headers['set-cookie'];
      if (rawCookies == null || rawCookies.isEmpty) return;
      // Prefer the 'session' cookie by name; fall back to first cookie
      final rawCookie = rawCookies.firstWhere(
        (c) => c.trim().startsWith('session='),
        orElse: () => rawCookies.first,
      );
      int index = rawCookie.indexOf(';');
      String cookie = (index == -1) ? rawCookie : rawCookie.substring(0, index);
      await _storage.write(key: _cookieKey, value: cookie);
    } catch (e) {
      debugPrint('[ApiService] _updateCookie error: $e');
    }
  }

  /// Keep this for non-Dio consumers like VideoPlayerController
  static Future<Map<String, String>> getHeaders([String method = 'GET', String path = '']) async {
    method = method.toUpperCase();
    final cookie = await getSessionCookie();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AdityanveshanApp/1.0',
    };
    if (cookie.isNotEmpty) {
      headers['Cookie'] = cookie;
    }
    final appJwt = await IntegrityService.getAppJwt();
    if (appJwt != null && appJwt.isNotEmpty) {
      headers['X-App-JWT'] = appJwt;
    }
    if (path.isNotEmpty) {
      headers.addAll(SignatureUtil.generateSignatureHeaders(method, path));
    }
    return headers;
  }

  // --- Auth APIs ---

  static Future<Response> sendOtp(String identifier) async {
    return await _dio.post('/api/auth/send-otp', data: {'email': identifier, 'type': 'login'});
  }

  static Future<Response> verifyOtp(String identifier, String otp) async {
    return await _dio.post('/api/auth/verify-otp', data: {'email': identifier, 'otp': otp});
  }

  static Future<Response> getProfile() async {
    return await _dio.get('/api/auth/me');
  }

  static Future<void> logout() async {
    await _dio.get('/api/auth/logout');
    await _storage.delete(key: _cookieKey);
  }

  // --- Dashboard & Courses APIs ---

  static Future<Response> getDashboardData() async {
    return await _dio.get('/api/user/dashboard-data');
  }

  static Future<Response> getCourses() async {
    return await _dio.get('/api/courses');
  }

  static Future<Response> getCourseLessons(String courseId) async {
    return await _dio.get('/api/courses/$courseId/lessons');
  }

  static Future<Response> getLiveSessions(String courseId) async {
    return await _dio.get('/api/courses/$courseId/live');
  }

  static Future<Response> updateProgress(String courseId, int progressPercent) async {
    return await _dio.post('/api/courses/$courseId/progress', data: {'progress': progressPercent});
  }

  static Future<Response> completeLesson(String courseId, String lessonId, int timeSpentSeconds) async {
    return await _dio.post('/api/courses/$courseId/lessons/$lessonId/complete',
      data: {'timeSpentSeconds': timeSpentSeconds},
    );
  }

  static Future<Response> getLiveClassToken({String? meetingId, String? sessionId}) async {
    final payload = <String, dynamic>{};
    if (meetingId != null && meetingId.trim().isNotEmpty) payload['meetingId'] = meetingId.trim();
    if (sessionId != null && sessionId.trim().isNotEmpty) payload['sessionId'] = sessionId.trim();
    return await _dio.post('/api/live/token', data: payload);
  }

  static Future<Response> leaveLiveClass({String? meetingId, String? sessionId}) async {
    final payload = <String, dynamic>{};
    if (meetingId != null && meetingId.isNotEmpty) payload['meetingId'] = meetingId;
    if (sessionId != null && sessionId.isNotEmpty) payload['sessionId'] = sessionId;
    return await _dio.post('/api/live/leave', data: payload);
  }

  // --- Payment APIs ---

  static Future<Response> createCourseOrder({
    required String itemType,
    required String itemId,
    String? couponCode,
    Map<String, String>? billingAddress,
  }) async {
    final body = <String, dynamic>{
      'itemType': itemType,
      'itemId': itemId,
      'billingAddress': billingAddress ?? {'country': 'India'},
    };
    if (couponCode != null && couponCode.isNotEmpty) {
      body['couponCode'] = couponCode;
    }
    return await _dio.post('/api/payments/create-order', data: body);
  }

  static Future<Response> verifyCoursePayment(Map<String, dynamic> paymentData) async {
    return await _dio.post('/api/payments/verify', data: paymentData);
  }

  // --- Subscription APIs ---

  static Future<Response> getSubscriptionPlans() async {
    return await _dio.get('/api/subscription/plans');
  }

  static Future<Response> getUserSubscription() async {
    return await _dio.get('/api/subscription/me');
  }

  static Future<Response> createSubscription(String planId) async {
    return await _dio.post('/api/subscription/create', data: {'planId': planId});
  }

  static Future<Response> cancelSubscription() async {
    return await _dio.post('/api/subscription/cancel', data: {});
  }

  // --- Credits & Wallet APIs ---

  static Future<Response> getWalletBalance() async {
    return await _dio.get('/api/wallet/balance');
  }

  static Future<Response> getWalletLedger() async {
    return await _dio.get('/api/wallet/ledger');
  }

  static Future<Response> getCreditPacks() async {
    return await _dio.get('/api/credits/packs');
  }

  static Future<Response> getSettings() async {
    return await _dio.get('/api/settings');
  }

  // --- Notification APIs ---

  static Future<Response> unregisterDevice() async {
    return await _dio.post('/api/notifications/unregister-device');
  }

  static Future<Response> getNotifications() async {
    return await _dio.get('/api/notifications');
  }

  // --- AI APIs ---

  static Future<Response> getAiModels() async {
    return await _dio.get('/api/ai/models');
  }

  static Future<Response> sendAiMessage(String prompt, String sessionId, {String? modelId}) async {
    final data = <String, dynamic>{
      'prompt': prompt,
      'sessionId': sessionId,
    };
    if (modelId != null) data['modelId'] = modelId;
    return await _dio.post('/api/ai/chat', data: data);
  }

  // --- Exams & Quizzes APIs ---

  static Future<Response> getExams() async {
    return await _dio.get('/api/exams');
  }

  static Future<Response> getExamDetails(String examId) async {
    return await _dio.get('/api/exams/$examId');
  }

  static Future<Response> submitExam(String examId, Map<String, dynamic> data) async {
    return await _dio.post('/api/exams/$examId/submit', data: data);
  }

  // --- Books API ---

  static Future<Response> getBooks() async {
    return await _dio.get('/api/books');
  }

  // --- Checkout / Payment helpers (used by checkout_screen) ---

  static Future<Response> getQuote(Map<String, dynamic> data) async {
    return await _dio.post('/api/checkout/quote', data: data);
  }

  static Future<Response> createTopupOrder(Map<String, dynamic> data) async {
    return await _dio.post('/api/razorpay/create-topup-order', data: data);
  }

  static Future<Response> createEnrollmentOrder(Map<String, dynamic> data) async {
    return await _dio.post('/api/payments/create-order', data: data);
  }

  static Future<Response> verifyPayment(Map<String, dynamic> data) async {
    return await _dio.post('/api/payments/verify', data: data);
  }

  static Future<Response> verifyTopupPayment(Map<String, dynamic> data) async {
    return await _dio.post('/api/razorpay/verify-topup-payment', data: data);
  }
}
