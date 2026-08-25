import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../services/admin_api_service.dart';
import '../services/analytics_service.dart';
import '../services/notification_service.dart';

class AdminProvider with ChangeNotifier {
  bool _disposed = false;
  bool _isLoggingOut = false;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _adminUser;
  Map<String, dynamic>? _dashboardStats;
  bool _isLoading = true;
  String? _error;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get adminUser => _adminUser;
  Map<String, dynamic>? get dashboardStats => _dashboardStats;
  bool get isLoading => _isLoading;
  String? get error => _error;

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  AdminProvider() {
    AdminApiService.onUnauthorized = () async {
      await logout();
    };
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    _error = null;
    if (_disposed) return;
    notifyListeners();

    try {
      final cookie = await AdminApiService.getSessionCookie();
      if (cookie.isNotEmpty) {
        final response = await AdminApiService.validateSession();
        if (response.statusCode == 200) {
          _isAuthenticated = true;
          // Dashboard stats fetched lazily by AdminDashboardScreen initState
        } else {
          _isAuthenticated = false;
          _error = 'Access denied: Invalid admin session';
          await AdminApiService.clearSession();
        }
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
      _error = 'Session validation failed';
      await AdminApiService.clearSession();
    }

    _isLoading = false;
    if (_disposed) return;
    notifyListeners();
  }

  Future<bool> sendOtp(String email) async {
    _error = null;
    if (_disposed) return false;

    try {
      final response = await AdminApiService.sendLoginOtp(email);
      if (response.statusCode == 200) {
        return true;
      } else {
        final data = response.data;
        final errMsg = data is Map ? (data['error'] ?? 'Failed to send OTP') : 'Failed to send OTP';
        _error = errMsg;
        debugPrint('[AdminLogin] sendOtp failed: $_error');
      }
    } on DioException catch (e) {
      final errMsg = e.response?.data is Map ? e.response!.data['error'] : 'Connection error: ${e.message}';
      _error = errMsg;
      debugPrint('[AdminLogin] sendOtp DioException: $_error');
    } catch (e) {
      _error = 'Unknown error occurred';
      debugPrint('[AdminLogin] sendOtp error: $e');
    }

    return false;
  }

  Future<bool> verifyOtp(String email, String otp) async {
    _error = null;
    if (_disposed) return false;

    try {
      final response = await AdminApiService.verifyLoginOtp(email, otp);
      if (response.statusCode == 200) {
        final data = response.data is Map ? response.data as Map : <String, dynamic>{};
        final role = data['role'];
        if (role == 'admin') {
          _isAuthenticated = true;
          final rawUser = data['user'];
          _adminUser = rawUser is Map ? Map<String, dynamic>.from(rawUser) : null;

          final userId = _adminUser?['id']?.toString();
          await _setTelemetryUser(userId);

          // Register device for push notifications now that session exists.
          AdminNotificationService.instance.registerDevice().catchError((_) {});

          if (_disposed) return false;
          notifyListeners();
          return true;
        } else {
          _error = 'Access denied: You are not an admin';
          await logout();
        }
      } else {
        final data = response.data;
        _error = data is Map ? data['error'] : 'OTP verification failed';
        debugPrint('[AdminLogin] verifyOtp failed status=${response.statusCode} error=$_error');
      }
    } on DioException catch (e) {
      _error = e.response?.data is Map ? e.response!.data['error'] : 'Connection error: ${e.message}';
      debugPrint('[AdminLogin] verifyOtp DioException: $_error');
    } catch (e) {
      _error = 'Unknown error occurred';
      debugPrint('[AdminLogin] verifyOtp error: $e');
    }

    return false;
  }

  Future<void> logout() async {
    if (_isLoggingOut) return;
    _isLoggingOut = true;
    _isAuthenticated = false;
    _adminUser = null;
    _dashboardStats = null;
    try {
      final deviceId = AdminNotificationService.instance.deviceId;
      try {
        await AdminApiService.logout(deviceId);
      } catch (_) {
        // Ignore backend logout failures
      }
    } finally {
      try {
        await AdminApiService.clearSession();
      } catch (_) {}
      await _clearTelemetryUser();
      _isLoggingOut = false;
      if (!_disposed) {
        notifyListeners();
      }
    }
  }

  Future<void> _setTelemetryUser(String? userId) async {
    if (userId == null || userId.isEmpty) return;
    try {
      await FirebaseCrashlytics.instance.setUserIdentifier(userId);
      await AnalyticsService.instance.setUserId(userId);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AdminProvider] set telemetry user failed: $e');
      }
    }
  }

  Future<void> _clearTelemetryUser() async {
    try {
      await FirebaseCrashlytics.instance.setUserIdentifier('');
      await AnalyticsService.instance.setUserId(null);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AdminProvider] clear telemetry user failed: $e');
      }
    }
  }

  Future<void> fetchDashboardStats() async {
    try {
      final response = await AdminApiService.getDashboardStats();
      if (response.statusCode == 200) {
        final raw = response.data;
        _dashboardStats = raw is Map ? Map<String, dynamic>.from(raw) : null;
        if (_disposed) return;
        notifyListeners();
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        await logout();
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        await logout();
      }
      debugPrint('Failed to fetch dashboard stats: ${e.message}');
    } catch (e) {
      debugPrint('Failed to fetch dashboard stats: $e');
    }
  }
}
