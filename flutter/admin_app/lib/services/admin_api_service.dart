import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'admin_routes.dart';
import 'notification_service.dart';

class AdminApiService {
  static String get baseUrl => AdminRoutes.baseUrl;
  static const _storage = FlutterSecureStorage();

  static VoidCallback? onUnauthorized;

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: AdminRoutes.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) => status != null && status <= 500,
    ),
  )..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final cookie = await getSessionCookie();
        if (cookie.isNotEmpty) {
          options.headers['Cookie'] = cookie;
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        await _updateCookie(response);
        if (response.statusCode == 401 || response.statusCode == 403) {
          _clearSessionAndNotify();
        }
        return handler.next(response);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 || error.response?.statusCode == 403) {
          _clearSessionAndNotify();
        }
        return handler.next(error);
      },
    ));

  static void _clearSessionAndNotify() {
    clearSession();
    final callback = onUnauthorized;
    callback?.call();
  }

  static Future<String> getSessionCookie() async {
    return await _storage.read(key: 'admin_session_cookie') ?? '';
  }

  static Future<Map<String, String>?> getSessionCookieParts() async {
    final cookie = await getSessionCookie();
    if (cookie.isEmpty) return null;
    final index = cookie.indexOf('=');
    if (index == -1) return null;
    final name = cookie.substring(0, index).trim();
    final value = cookie.substring(index + 1).trim();
    if (name.isEmpty || value.isEmpty) return null;
    return {'name': name, 'value': value};
  }

  static Future<void> _updateCookie(Response response) async {
    final rawCookies = response.headers['set-cookie'];
    if (rawCookies != null && rawCookies.isNotEmpty) {
      // Prefer the 'session' cookie by name; fall back to first cookie
      final rawCookie = rawCookies.firstWhere(
        (c) => c.trim().startsWith('session='),
        orElse: () => rawCookies.first,
      );
      int index = rawCookie.indexOf(';');
      String cookie = (index == -1) ? rawCookie : rawCookie.substring(0, index);
      final oldCookie = await _storage.read(key: 'admin_session_cookie');
      await _storage.write(key: 'admin_session_cookie', value: cookie);
      if (oldCookie != cookie) {
        AdminNotificationService.instance.registerDevice();
      }
    }
  }

  static Future<void> clearSession() async {
    await _storage.delete(key: 'admin_session_cookie');
  }

  static Future<Response> logout(String? deviceId) async {
    final data = deviceId != null ? {'device_id': deviceId} : <String, dynamic>{};
    return await _dio.post('/api/auth/logout', data: data);
  }

  static Future<Response> validateSession() async {
    return await _dio.get('/api/auth/me');
  }

  // --- API Methods ---

  static Future<Response> sendLoginOtp(String email) async {
    return await _dio.post('/api/auth/send-otp', data: {'email': email, 'type': 'login'});
  }

  static Future<Response> verifyLoginOtp(String email, String otp) async {
    return await _dio.post('/api/auth/verify-otp', data: {'email': email, 'otp': otp});
  }

  static Future<Response> getDashboardStats() async {
    return await _dio.get('/api/admin/stats');
  }

  static Future<Response> getCourses() async {
    return await _dio.get('/api/admin/courses');
  }

  static Future<Response> createCourse(Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/courses', data: data);
  }

  static Future<Response> updateCourse(String id, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/courses/$id', data: data);
  }

  static Future<Response> deleteCourse(String id) async {
    return await _dio.delete('/api/admin/courses/$id');
  }

  static Future<Response> getCourseLessons(String courseId) async {
    return await _dio.get('/api/admin/courses/$courseId/lessons');
  }

  static Future<Response> createCourseLesson(String courseId, Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/courses/$courseId/lessons', data: data);
  }

  static Future<Response> updateCourseLesson(String courseId, String lessonId, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/courses/$courseId/lessons/$lessonId', data: data);
  }

  static Future<Response> deleteCourseLesson(String courseId, String lessonId) async {
    return await _dio.delete('/api/admin/courses/$courseId/lessons/$lessonId');
  }

  static Future<Response> getUsers() async {
    return await _dio.get('/api/admin/users');
  }

  static Future<Response> getBooks() async {
    return await _dio.get('/api/admin/books');
  }

  static Future<Response> createBook(Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/books', data: data);
  }

  static Future<Response> updateBook(String id, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/books/$id', data: data);
  }

  static Future<Response> deleteBook(String id) async {
    return await _dio.delete('/api/admin/books/$id');
  }

  static Future<Response> getBatches({String? courseId}) async {
    final queryParameters = courseId != null ? {'course_id': courseId} : null;
    return await _dio.get('/api/admin/batches', queryParameters: queryParameters);
  }

  static Future<Response> getBatch(String id) async {
    return await _dio.get('/api/admin/batches/$id');
  }

  static Future<Response> createBatch(Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/batches', data: data);
  }

  static Future<Response> updateBatch(String id, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/batches/$id', data: data);
  }

  static Future<Response> deleteBatch(String id) async {
    return await _dio.delete('/api/admin/batches/$id');
  }

  static Future<Response> getBatchStudents(String batchId) async {
    return await _dio.get('/api/admin/batches/$batchId/students');
  }

  static Future<Response> getLiveClasses() async {
    return await _dio.get('/api/admin/live-classes');
  }

  static Future<Response> createLiveSession(String courseId, Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/courses/$courseId/live', data: data);
  }

  static Future<Response> updateLiveSession(String sessionId, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/live/$sessionId', data: data);
  }

  static Future<Response> deleteLiveSession(String sessionId) async {
    return await _dio.delete('/api/admin/live/$sessionId');
  }

  static Future<Response> sendOtp() async {
    return await _dio.post('/api/admin/actions/send-otp', data: {'type': 'credit_grant'});
  }

  static Future<Response> giveCredits(String userId, String otp, int amount) async {
    return await _dio.post('/api/admin/users/$userId/balance', data: {
      'otp': otp,
      'amount': amount,
    });
  }

  static Future<Response> sendPushNotification(Map<String, dynamic> data) async {
    return await _dio.post('/api/notifications/send', data: data);
  }

  static Future<Response> getAiModels() async {
    return await _dio.get('/api/admin/ai-models');
  }

  static Future<Response> createAiModel(Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/ai-models', data: data);
  }

  static Future<Response> updateAiModel(String id, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/ai-models/$id', data: data);
  }

  static Future<Response> deleteAiModel(String id) async {
    return await _dio.delete('/api/admin/ai-models/$id');
  }

  static Future<Response> getCourseBooks(String courseId) async {
    return await _dio.get('/api/admin/courses/$courseId/books');
  }

  static Future<Response> addCourseBook(String courseId, String bookId) async {
    return await _dio.post('/api/admin/courses/$courseId/books', data: {'book_id': bookId});
  }

  static Future<Response> removeCourseBook(String courseId, String bookId) async {
    return await _dio.delete('/api/admin/courses/$courseId/books/$bookId');
  }

  static Future<List<String>> getCourseChapters(String courseId) async {
    try {
      final response = await _dio.get('/api/admin/courses/$courseId/chapters');
      if (response.statusCode == 200) {
        return List<String>.from(response.data['chapters'] ?? []);
      }
    } catch (_) {}
    return [];
  }

  static Future<List<String>> getBookChapters(String bookId) async {
    try {
      final response = await _dio.get('/api/admin/books/$bookId/chapters');
      if (response.statusCode == 200) {
        return List<String>.from(response.data['chapters'] ?? []);
      }
    } catch (_) {}
    return [];
  }

  static Future<Response> getBookLessons(String bookId) async {
    return await _dio.get('/api/admin/books/$bookId/lessons');
  }

  static Future<Response> createBookLesson(String bookId, Map<String, dynamic> data) async {
    return await _dio.post('/api/admin/books/$bookId/lessons', data: data);
  }

  static Future<Response> updateBookLesson(String bookId, String lessonId, Map<String, dynamic> data) async {
    return await _dio.put('/api/admin/books/$bookId/lessons/$lessonId', data: data);
  }

  static Future<Response> deleteBookLesson(String bookId, String lessonId) async {
    return await _dio.delete('/api/admin/books/$bookId/lessons/$lessonId');
  }
}
