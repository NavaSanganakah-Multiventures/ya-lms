import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class AuthProvider with ChangeNotifier {
  static const String _cachedProfileKey = 'cached_user_profile';
  static const String _cachedProfileTimeKey = 'cached_profile_time';
  static const int _cacheTtlMs = 5 * 60 * 1000; // 5 minutes

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
      // Quick local check — agar cookie hi nahi toh network call mat karo
      final cookie = await ApiService.getSessionCookie();
      if (cookie.isEmpty) {
        _isAuthenticated = false;
        _user = null;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // 1. Turant cached profile dikha do
      final cached = await _getCachedProfile();
      if (cached != null) {
        _isAuthenticated = true;
        _user = cached;
        _isLoading = false;
        notifyListeners();
      }

      // 2. Background mein fresh data lao
      try {
        final response = await ApiService.getProfile();
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['user'] != null) {
            _user = data['user'];
            _isAuthenticated = true;
            await _cacheProfile(data['user']);
            NotificationService.instance.onLogin();
          } else {
            _isAuthenticated = false;
            _user = null;
            await _clearCachedProfile();
          }
        } else {
          _isAuthenticated = false;
          _user = null;
          await _clearCachedProfile();
        }
      } catch (e) {
        // Network error — cached data se chalo
        if (_user == null) {
          _isAuthenticated = false;
        }
      }
    } catch (e) {
      _isAuthenticated = false;
      _user = null;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>?> _getCachedProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final timestamp = prefs.getInt(_cachedProfileTimeKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > _cacheTtlMs) return null;

      final json = prefs.getString(_cachedProfileKey);
      if (json == null || json.isEmpty) return null;
      return jsonDecode(json) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> _cacheProfile(Map<String, dynamic> profile) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cachedProfileKey, jsonEncode(profile));
      await prefs.setInt(_cachedProfileTimeKey, DateTime.now().millisecondsSinceEpoch);
    } catch (_) {}
  }

  Future<void> _clearCachedProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cachedProfileKey);
      await prefs.remove(_cachedProfileTimeKey);
    } catch (_) {}
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
        final data = jsonDecode(response.body);
        _isAuthenticated = true;
        _user = data['user'];
        if (_user != null) {
          await _cacheProfile(_user!);
        }
        notifyListeners();
        NotificationService.instance.onLogin();
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
    await _clearCachedProfile();
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }
}
