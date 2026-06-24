import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/admin_api_service.dart';

class AdminProvider with ChangeNotifier {
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

  AdminProvider() {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final cookie = await AdminApiService.getSessionCookie();
      if (cookie.isNotEmpty) {
        _isAuthenticated = true;
        // Optionally fetch admin profile here
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> sendOtp(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await AdminApiService.sendLoginOtp(email);
      if (response.statusCode == 200) {
        _isLoading = false;
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
    notifyListeners();
    return false;
  }

  Future<bool> verifyOtp(String email, String otp) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await AdminApiService.verifyLoginOtp(email, otp);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['role'] == 'admin') {
          _isAuthenticated = true;
          _isLoading = false;
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
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    _isAuthenticated = false;
    _adminUser = null;
    _dashboardStats = null;
    try {
      await AdminApiService.clearSession();
    } finally {
      notifyListeners();
    }
  }

  Future<void> fetchDashboardStats() async {
    try {
      final response = await AdminApiService.getDashboardStats();
      if (response.statusCode == 200) {
        _dashboardStats = jsonDecode(response.body);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Failed to fetch dashboard stats: $e');
    }
  }
}
