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

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await AdminApiService.login(email, password);
      if (response.statusCode == 200) {
        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = jsonDecode(response.body);
        _error = data['error'] ?? 'Login failed';
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
    notifyListeners();
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
