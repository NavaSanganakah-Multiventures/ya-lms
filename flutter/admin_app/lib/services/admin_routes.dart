import 'package:flutter/foundation.dart';

class AdminRoutes {
  static String get baseUrl {
    if (kReleaseMode) return 'https://lms.yagyaashram.com';
    if (kIsWeb) return 'http://localhost:3000';
    return 'http://10.0.2.2:3000';
  }

  static Uri get dashboard => Uri.parse('$baseUrl/admin');
  static Uri get courses => Uri.parse('$baseUrl/admin/course');
  static Uri get liveClasses => Uri.parse('$baseUrl/admin/course');
  static Uri get users => Uri.parse('$baseUrl/admin/users');
  static Uri get subscriptions => Uri.parse('$baseUrl/admin/subscriptions');
}
