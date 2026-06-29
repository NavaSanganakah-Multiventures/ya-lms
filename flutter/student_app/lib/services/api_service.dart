import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  ApiService._();

  static const String _baseUrl = 'http://10.0.2.2:8787/api';

  static Future<http.Response> get(String path) {
    return http.get(Uri.parse('$_baseUrl$path'));
  }

  static Future<http.Response> post(String path, {Map<String, dynamic>? body}) {
    return http.post(
      Uri.parse('$_baseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: body != null ? jsonEncode(body) : null,
    );
  }

  static Future<http.Response> getDashboardData() => get('/student/dashboard');
  static Future<http.Response> getUserSubscription() => get('/student/subscription');
  static Future<http.Response> getCourses() => get('/courses');
  static Future<http.Response> getBooks() => get('/books');
  static Future<http.Response> getCreditBalance() => get('/credits/balance');
  static Future<http.Response> getCreditPacks() => get('/credits/packs');
  static Future<http.Response> getCreditSettings() => get('/credits/settings');
}
