import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

class AdminApiService {
  static String get baseUrl {
    if (kReleaseMode) {
      return 'https://lms.yagyaashram.com';
    } else {
      if (kIsWeb) return 'http://localhost:3000';
      return 'http://10.0.2.2:3000';
    }
  }

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
      await prefs.setString('admin_session_cookie', cookie);
    }
  }

  // Add methods for login, getting dashboard stats, courses, etc.
  static Future<http.Response> login(String email, String password) async {
    final url = Uri.parse('$baseUrl/api/admin/login'); // Assuming this exists or similar auth flow
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'email': email, 'password': password}),
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

  static Future<http.Response> getUsers() async {
    final url = Uri.parse('$baseUrl/api/admin/users');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> getLiveClasses() async {
    final url = Uri.parse('$baseUrl/api/admin/live-classes');
    return await http.get(url, headers: await getHeaders());
  }

  static Future<http.Response> sendOtp() async {
    final url = Uri.parse('$baseUrl/api/admin/actions/send-otp');
    return await http.post(url, headers: await getHeaders());
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
    );
  }
}
