import 'package:flutter/foundation.dart';

class AdminRoutes {
  static String get baseUrl {
    // Allow override via --dart-define=API_BASE_URL=...
    const envBaseUrl = String.fromEnvironment('API_BASE_URL');
    if (envBaseUrl.isNotEmpty) return envBaseUrl;
    if (kReleaseMode) return 'https://lms.yagyaashram.com';
    if (kIsWeb) return 'http://localhost:3000';
    return 'http://10.0.2.2:3000';
  }

  static Uri get dashboard => Uri.parse('$baseUrl/admin');
  static Uri get courses => Uri.parse('$baseUrl/admin/courses');
  static Uri get liveClasses => Uri.parse('$baseUrl/admin/live-classes');
  static Uri get users => Uri.parse('$baseUrl/admin/users');
  static Uri get subscriptions => Uri.parse('$baseUrl/admin/subscriptions');
}
