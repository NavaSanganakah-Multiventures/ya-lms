import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Cross-platform storage for the admin session cookie.
///
/// On Android/iOS the cookie is kept in secure storage. On web the browser
/// manages HttpOnly cookies itself, so we do not try to read/write them from
/// Dart code. Instead we rely on Dio sending credentials automatically.
class AdminSessionStorage {
  static const _cookieKey = 'admin_session_cookie';
  static const _secureStorage = FlutterSecureStorage();

  /// Returns the stored session cookie. Empty on web because the browser
  /// handles cookies automatically.
  static Future<String> getSessionCookie() async {
    if (kIsWeb) return '';
    try {
      return await _secureStorage.read(key: _cookieKey) ?? '';
    } catch (_) {
      return '';
    }
  }

  /// Parses a 'name=value' cookie string into its parts.
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

  /// Stores the session cookie (non-web only).
  static Future<void> setSessionCookie(String cookie) async {
    if (kIsWeb) return;
    try {
      await _secureStorage.write(key: _cookieKey, value: cookie);
    } catch (_) {}
  }

  /// Clears the stored session cookie (non-web only).
  static Future<void> clearSession() async {
    if (kIsWeb) return;
    try {
      await _secureStorage.delete(key: _cookieKey);
    } catch (_) {}
  }
}
