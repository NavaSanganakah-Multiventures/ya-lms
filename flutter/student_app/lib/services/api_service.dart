import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'integrity_service.dart';

class ApiService {
  // Use a different base URL based on whether running on web, emulator, or real device.
  // We can default to the production URL, or local development URL if preferred.
  // For standard Next.js local development:
  // Android emulator: http://10.0.2.2:3000
  // iOS simulator: http://localhost:3000
  // Web: http://localhost:3000

  // Compile-time override for API base URL via --dart-define=API_BASE_URL
  // If provided, this takes precedence over the default production URL.
  static const String _envApiBase = String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static String get baseUrl {
    // If an API base URL is provided at build time, use it (for local dev/testing).
    if (_envApiBase.isNotEmpty) return _envApiBase;

    // Default to production URL for all builds
    return 'https://lms.yagyaashram.com';
  }

  // Helper method to get the cookie header
  static Future<String> getSessionCookie() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('session_cookie') ?? '';
  }

  static Future<String?> getSessionCookieValue() async {
    final cookie = await getSessionCookie();
    if (cookie.isEmpty || !cookie.contains('=')) return null;
    return cookie.substring(cookie.indexOf('=') + 1);
  }

  static Future<Map<String, String>> getHeaders() async {
    final cookie = await getSessionCookie();

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'AdityanveshanApp/1.0', // Helps bypass basic WAF Cloudflare blocks
    };

    if (cookie.isNotEmpty) {
      headers['Cookie'] = cookie;
    }

    final appJwt = await IntegrityService.getAppJwt();
    if (appJwt != null && appJwt.isNotEmpty) {
       headers['X-App-JWT'] = appJwt;
    }

    return headers;
  }

  // Callback triggered on 401/403 — AuthProvider should set this
  static void Function()? onUnauthorized;

  static Future<bool> _checkAndHandleAuthError(http.Response response) async {
    if (response.statusCode == 401 || response.statusCode == 403) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('session_cookie');
      onUnauthorized?.call();
      return true;
    }
    return false;
  }

  // Helper method to save cookies from the response
  static Future<void> _updateCookie(http.Response response) async {
    String? rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      int index = rawCookie.indexOf(';');
      String cookie = (index == -1) ? rawCookie : rawCookie.substring(0, index);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('session_cookie', cookie);
    }
  }

  // --- Auth APIs ---

  static Future<http.Response> sendOtp(String identifier) async {
    final url = Uri.parse('$baseUrl/api/auth/send-otp');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'email': identifier, 'type': 'login'}),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    return response;
  }

  static Future<http.Response> leaveLiveClass({String? meetingId, String? sessionId}) async {
    final url = Uri.parse('$baseUrl/api/live/leave');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({
        if (meetingId != null && meetingId.isNotEmpty) 'meetingId': meetingId,
        if (sessionId != null && sessionId.isNotEmpty) 'sessionId': sessionId,
      }),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> completeLesson(String courseId, String lessonId, int timeSpentSeconds) async {
    final url = Uri.parse('$baseUrl/api/courses/$courseId/lessons/$lessonId/complete');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'timeSpentSeconds': timeSpentSeconds}),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> verifyOtp(String identifier, String otp) async {
    final url = Uri.parse('$baseUrl/api/auth/verify-otp');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'email': identifier, 'otp': otp}),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    return response;
  }

  static Future<http.Response> getProfile() async {
    final url = Uri.parse('$baseUrl/api/auth/me');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    await _updateCookie(response);
    return response;
  }

  static Future<void> logout() async {
    final url = Uri.parse('$baseUrl/api/auth/logout');
    await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('session_cookie');
  }

  // --- Dashboard & Courses APIs ---

  static Future<http.Response> getDashboardData() async {
    final url = Uri.parse('$baseUrl/api/user/dashboard-data');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> updateProgress(String courseId, int progressPercent) async {
    final url = Uri.parse('$baseUrl/api/courses/$courseId/progress');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'progress': progressPercent}),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getBooks() async {
    final url = Uri.parse('$baseUrl/api/books');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getCourses() async {
    final url = Uri.parse('$baseUrl/api/courses');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  // We'll need a method to get lessons for a course
  static Future<http.Response> getCourseLessons(String courseId) async {
    final url = Uri.parse('$baseUrl/api/courses/$courseId/lessons');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getLiveSessions(String courseId) async {
    final url = Uri.parse('$baseUrl/api/courses/$courseId/live');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getLiveClassToken({
    String? meetingId,
    String? sessionId,
  }) async {
    final url = Uri.parse('$baseUrl/api/live/token');
    final payload = <String, String>{
      if (meetingId != null && meetingId.trim().isNotEmpty)
        'meetingId': meetingId.trim(),
      if (sessionId != null && sessionId.trim().isNotEmpty)
        'sessionId': sessionId.trim(),
    };
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode(payload),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  // --- Payment APIs ---

  static Future<http.Response> createCourseOrder({
    required String itemType,
    required String itemId,
    String? couponCode,
    Map<String, String>? billingAddress,
  }) async {
    final url = Uri.parse('$baseUrl/api/payments/create-order');
    final body = <String, dynamic>{
      'itemType': itemType,
      'itemId': itemId,
      'billingAddress': billingAddress ?? {'country': 'India'},
    };
    if (couponCode != null && couponCode.isNotEmpty) {
      body['couponCode'] = couponCode;
    }
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> verifyCoursePayment(Map<String, dynamic> paymentData) async {
    final url = Uri.parse('$baseUrl/api/payments/verify');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode(paymentData),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  // --- Subscription APIs ---

  static Future<http.Response> getSubscriptionPlans() async {
    final url = Uri.parse('$baseUrl/api/subscription/plans');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getUserSubscription() async {
    final url = Uri.parse('$baseUrl/api/subscription/me');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> createSubscription(String planId) async {
    final url = Uri.parse('$baseUrl/api/subscription/create');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'planId': planId}),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> cancelSubscription() async {
    final url = Uri.parse('$baseUrl/api/subscription/cancel');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({}),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }

  // --- Credits & Wallet APIs ---

  static Future<http.Response> getWalletBalance() async {
    final url = Uri.parse('$baseUrl/api/wallet/balance');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getCreditPacks() async {
    final url = Uri.parse('$baseUrl/api/credits/packs');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getSettings() async {
    final url = Uri.parse('$baseUrl/api/settings');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getWalletLedger() async {
    final url = Uri.parse('$baseUrl/api/wallet/ledger');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  // --- Notification APIs ---

  static Future<http.Response> unregisterDevice() async {
    final url = Uri.parse('$baseUrl/api/notifications/unregister-device');
    final response = await http.post(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 10));
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> getNotifications() async {
    final url = Uri.parse('$baseUrl/api/notifications');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }
  static Future<http.Response> getAiModels() async {
    final url = Uri.parse('$baseUrl/api/ai/models');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }
  static Future<http.Response> sendAiMessage(String prompt, String sessionId, {String? modelId}) async {
    final url = Uri.parse('$baseUrl/api/ai/chat');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({
        'prompt': prompt,
        'sessionId': sessionId,
        if (modelId != null) 'modelId': modelId,
      }),
    ).timeout(const Duration(seconds: 30));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }
  // --- Exams & Quizzes APIs ---
  static Future<http.Response> getExams() async {
    final url = Uri.parse('$baseUrl/api/exams');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    ).timeout(const Duration(seconds: 25));
    await _updateCookie(response);
    await _checkAndHandleAuthError(response);
    return response;
  }

  static Future<http.Response> submitExam(String examId, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/exams/$examId/submit');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode(data),
    ).timeout(const Duration(seconds: 25));
    await _checkAndHandleAuthError(response);
    return response;
  }
}
