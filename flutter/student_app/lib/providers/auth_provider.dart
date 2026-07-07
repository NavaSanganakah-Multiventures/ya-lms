import 'dart:convert';

import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;

  AuthProvider() {
    checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.getProfile();
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['user'] != null) {
          _isAuthenticated = true;
          _user = data['user'];
          NotificationService.instance.onLogin();
        } else {
          _isAuthenticated = false;
        }
      } else {
        _isAuthenticated = false;
      }
    } catch (e) {
      _isAuthenticated = false;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>> sendOtp(String identifier) async {
    try {
      final response = await ApiService.sendOtp(identifier);
      if (response.statusCode == 200) {
        return {'success': true};
      }
      try {
        final body = jsonDecode(response.body);
        return {'success': false, 'message': body['error'] ?? 'OTP भेजने में समस्या हुई'};
      } catch (_) {
        return {'success': false, 'message': 'OTP भेजने में समस्या हुई (${response.statusCode})'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: ${e.toString()}'};
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String identifier, String otp) async {
    try {
      final response = await ApiService.verifyOtp(identifier, otp);
      if (response.statusCode == 200) {
        await checkAuthStatus();
        return {'success': true};
      }
      try {
        final body = jsonDecode(response.body);
        return {'success': false, 'message': body['error'] ?? 'OTP मान्य नहीं है'};
      } catch (_) {
        return {'success': false, 'message': 'OTP मान्य नहीं है (${response.statusCode})'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network error: ${e.toString()}'};
    }
  }

  Future<void> logout() async {
    await ApiService.logout();
    await NotificationService.instance.onLogout();
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }
}
