import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'admin_routes.dart';

import 'notification_service.dart';

class AdminApiService {
  static String get baseUrl => AdminRoutes.baseUrl;

  static Future<String> getSessionCookie() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('admin_session_cookie') ?? '';
  }

  static Future<Map<String, String>> getHeaders() async {
    final cookie = await getSessionCookie();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (cookie.isNotEmpty) 'Cookie': cookie,
    };
  }

  static Future<void> _updateCookie(http.Response response) async {
    String? rawCookie = response.headers['set-cookie'];
    if (rawCookie != null) {
      int index = rawCookie.indexOf(';');
      String cookie = (index == -1) ? rawCookie : rawCookie.substring(0, index);
      final prefs = await SharedPreferences.getInstance();
      final oldCookie = prefs.getString('admin_session_cookie');
      await prefs.setString('admin_session_cookie', cookie);
      if (oldCookie == null || oldCookie.isEmpty) {
        AdminNotificationService.instance.registerDevice();
      }
    }
  }

  // Add methods for login, getting dashboard stats, courses, etc.
  static Future<http.Response> sendLoginOtp(String email) async {
    final url = Uri.parse('$baseUrl/api/auth/send-otp');
    return await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'email': email, 'type': 'login'}),
    );
  }

  static Future<http.Response> verifyLoginOtp(String email, String otp) async {
    final url = Uri.parse('$baseUrl/api/auth/verify-otp');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'email': email, 'otp': otp}),
    );
    await _updateCookie(response);
    return response;
  }

  static Future<http.Response> getDashboardStats() async {
    final url = Uri.parse('$baseUrl/api/admin/dashboard-stats'); // Example endpoint
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> getCourses() async {
    final url = Uri.parse('$baseUrl/api/admin/courses');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> createCourse(Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/admin/courses');
    return await http.post(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<http.Response> updateCourse(String id, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$id');
    return await http.put(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<http.Response> deleteCourse(String id) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$id');
    return await http.delete(url, headers: await getHeaders());
  }

  static Future<http.Response> getCourseLessons(String courseId) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$courseId/lessons');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> createCourseLesson(String courseId, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$courseId/lessons');
    return await http.post(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<http.Response> updateCourseLesson(String courseId, String lessonId, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$courseId/lessons/$lessonId');
    return await http.put(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<http.Response> deleteCourseLesson(String courseId, String lessonId) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$courseId/lessons/$lessonId');
    return await http.delete(url, headers: await getHeaders());
  }

  static Future<http.Response> getUsers() async {
    final url = Uri.parse('$baseUrl/api/admin/users');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> getBooks() async {
    final url = Uri.parse('$baseUrl/api/admin/books');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> deleteBook(String id) async {
    final url = Uri.parse('$baseUrl/api/admin/books/$id');
    return await http.delete(url, headers: await getHeaders());
  }

  static Future<http.Response> getBatches() async {
    final url = Uri.parse('$baseUrl/api/admin/batches');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> deleteBatch(String id) async {
    final url = Uri.parse('$baseUrl/api/admin/batches/$id');
    return await http.delete(url, headers: await getHeaders());
  }

  static Future<http.Response> getLiveClasses() async {
    final url = Uri.parse('$baseUrl/api/admin/live-classes');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> createLiveSession(String courseId, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/admin/courses/$courseId/live');
    return await http.post(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<http.Response> updateLiveSession(String sessionId, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/admin/live/$sessionId');
    return await http.put(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<http.Response> deleteLiveSession(String sessionId) async {
    final url = Uri.parse('$baseUrl/api/admin/live/$sessionId');
    return await http.delete(url, headers: await getHeaders());
  }

  static Future<http.Response> sendOtp() async {
    final url = Uri.parse('$baseUrl/api/admin/actions/send-otp');
    return await http.post(url, headers: await getHeaders()).timeout(const Duration(seconds: 30));
  }

  static Future<http.Response> giveCredits(String userId, String otp, int amount, String creditType) async {
    final url = Uri.parse('$baseUrl/api/admin/users/$userId/credits');
    return await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({
        'otp': otp,
        'amount': amount,
        'credit_type': creditType,
      }),
    ).timeout(const Duration(seconds: 30));
  }

  static Future<http.Response> sendPushNotification(Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/api/notifications/send');
    return await http.post(url, headers: await getHeaders(), body: jsonEncode(data));
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('admin_session_cookie');
  }
}
