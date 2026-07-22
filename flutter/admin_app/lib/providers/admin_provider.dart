import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
    _isLoading = true;
    _error = null;
    if (_disposed) return false;
    notifyListeners();

    try {
      final response = await AdminApiService.sendLoginOtp(email);
      if (response.statusCode == 200) {
        _isLoading = false;
        if (_disposed) return false;
        notifyListeners();
        return true;
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'Failed to send OTP';
      }
    } catch (e) {
      _error = 'Connection error: $e';
    }

    _isLoading = false;
    if (_disposed) return false;
    notifyListeners();
    return false;
  }

  Future<bool> verifyOtp(String email, String otp) async {
    _isLoading = true;
    _error = null;
    if (_disposed) return false;
    notifyListeners();

    try {
      final response = await AdminApiService.verifyLoginOtp(email, otp);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['role'] == 'admin') {
          _isAuthenticated = true;
          _isLoading = false;
          if (_disposed) return false;
          notifyListeners();
          return true;
        } else {
          _error = 'Access denied: You are not an admin';
          await logout();
        }
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'OTP verification failed';
      }
    } catch (e) {
      _error = 'Connection error: $e';
    }

    _isLoading = false;
    if (_disposed) return false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('admin_session_cookie');

    _isAuthenticated = false;
    _adminUser = null;
    _dashboardStats = null;
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
        _dashboardStats = jsonDecode(response.body);
        if (_disposed) return;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Failed to fetch dashboard stats: $e');
    }
  }
}
