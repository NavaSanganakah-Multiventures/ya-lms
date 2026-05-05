import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  // Use a different base URL based on whether running on web, emulator, or real device.
  // We can default to the production URL, or local development URL if preferred.
  // For standard Next.js local development:
  // Android emulator: http://10.0.2.2:3000
  // iOS simulator: http://localhost:3000
  // Web: http://localhost:3000

  static String get baseUrl {
    if (kReleaseMode) {
      // Replace with your production domain
      return 'https://app.adityanveshan.in';
    } else {
      if (kIsWeb) {
        return 'http://localhost:3000';
      }
      // For Android emulator
      return 'http://10.0.2.2:3000';
    }
  }

  // Helper method to get the cookie header
  static Future<Map<String, String>> getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final cookie = prefs.getString('session_cookie') ?? '';
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (cookie.isNotEmpty) 'Cookie': cookie,
    };
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
      body: jsonEncode({'identifier': identifier}),
    );
    await _updateCookie(response);
    return response;
  }

  static Future<http.Response> verifyOtp(String identifier, String otp) async {
    final url = Uri.parse('$baseUrl/api/auth/verify-otp');
    final response = await http.post(
      url,
      headers: await getHeaders(),
      body: jsonEncode({'identifier': identifier, 'otp': otp}),
    );
    await _updateCookie(response);
    return response;
  }

  static Future<http.Response> getProfile() async {
    final url = Uri.parse('$baseUrl/api/auth/me');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    );
    await _updateCookie(response);
    return response;
  }

  static Future<void> logout() async {
    final url = Uri.parse('$baseUrl/api/auth/logout');
    await http.get(
      url,
      headers: await getHeaders(),
    );
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('session_cookie');
  }

  // --- Courses APIs ---

  static Future<http.Response> getCourses() async {
    final url = Uri.parse('$baseUrl/api/courses');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    );
    return response;
  }

  // We'll need a method to get lessons for a course
  static Future<http.Response> getCourseLessons(String courseId) async {
    final url = Uri.parse('$baseUrl/api/courses/$courseId/lessons');
    final response = await http.get(
      url,
      headers: await getHeaders(),
    );
    return response;
  }
}
