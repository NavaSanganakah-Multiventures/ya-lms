import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/admin_api_service.dart';

class AdminProvider with ChangeNotifier {
  bool _disposed = false;
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
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    if (_disposed) return;
    notifyListeners();

    try {
      final cookie = await AdminApiService.getSessionCookie();
      if (cookie.isNotEmpty) {
        _isAuthenticated = true;
        await fetchDashboardStats();
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
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
        _error = data is Map ? data['error'] : 'Failed to send OTP';
      }
    } on DioException catch (e) {
      _error = e.response?.data is Map ? e.response!.data['error'] : 'Connection error: ${e.message}';
    } catch (e) {
      _error = 'Unknown error occurred';
    }

    return false;
  }

  Future<bool> verifyOtp(String email, String otp) async {
    _error = null;
    if (_disposed) return false;

    try {
      final response = await AdminApiService.verifyLoginOtp(email, otp);
      if (response.statusCode == 200) {
        final data = response.data;
        if (data['role'] == 'admin') {
          _isAuthenticated = true;
          _adminUser = data['user'];
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
      }
    } on DioException catch (e) {
      _error = e.response?.data is Map ? e.response!.data['error'] : 'Connection error: ${e.message}';
    } catch (e) {
      _error = 'Unknown error occurred';
    }

    return false;
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _adminUser = null;
    _dashboardStats = null;
    try {
      await AdminApiService.logout();
    } catch (e) {
      debugPrint('Server-side logout failed: $e');
    }
    try {
      await AdminApiService.clearSession();
    } finally {
      if (!_disposed) {
        notifyListeners();
      }
    }
  }

  Future<void> fetchDashboardStats() async {
    try {
      final response = await AdminApiService.getDashboardStats();
      if (response.statusCode == 200) {
        _dashboardStats = response.data;
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
