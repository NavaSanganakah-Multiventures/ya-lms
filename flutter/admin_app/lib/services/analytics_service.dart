import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';

class AnalyticsEvent {
  AnalyticsEvent._();

  // Admin navigation
  static const String login = 'login';
  static const String logout = 'logout';
  static const String screenView = 'screen_view';
  static const String openWebAdmin = 'open_web_admin';

  // Content management
  static const String courseCreated = 'course_created';
  static const String courseUpdated = 'course_updated';
  static const String courseDeleted = 'course_deleted';

  static const String bookCreated = 'book_created';
  static const String bookUpdated = 'book_updated';
  static const String bookDeleted = 'book_deleted';

  static const String lessonCreated = 'lesson_created';
  static const String lessonUpdated = 'lesson_updated';
  static const String lessonDeleted = 'lesson_deleted';

  static const String batchCreated = 'batch_created';
  static const String batchUpdated = 'batch_updated';
  static const String batchDeleted = 'batch_deleted';

  static const String liveClassCreated = 'live_class_created';
  static const String liveClassUpdated = 'live_class_updated';
  static const String liveClassDeleted = 'live_class_deleted';

  static const String userManaged = 'user_managed';
  static const String creditsGranted = 'credits_granted';

  static const String aiModelCreated = 'ai_model_created';
  static const String aiModelUpdated = 'ai_model_updated';
  static const String aiModelDeleted = 'ai_model_deleted';

  static const String pushNotificationSent = 'push_notification_sent';
}

class AnalyticsParameter {
  AnalyticsParameter._();

  static const String screenName = 'screen_name';
  static const String screenClass = 'screen_class';
  static const String itemType = 'item_type';
  static const String itemId = 'item_id';
  static const String userId = 'user_id';
  static const String email = 'email';
  static const String amount = 'amount';
  static const String success = 'success';
  static const String errorMessage = 'error_message';
  static const String methodName = 'method_name';
}

class AnalyticsService {
  AnalyticsService._();

  static final AnalyticsService _instance = AnalyticsService._();
  static AnalyticsService get instance => _instance;

  FirebaseAnalytics? _analytics;
  FirebaseAnalytics get analytics {
    final a = _analytics;
    if (a == null) {
      throw StateError('AnalyticsService has not been initialized. Call init() first.');
    }
    return a;
  }

  bool _initialized = false;
  bool get isInitialized => _initialized;

  void init(FirebaseAnalytics analytics) {
    _analytics = analytics;
    _initialized = true;
  }

  Future<void> logEvent({
    required String name,
    Map<String, Object?>? parameters,
  }) async {
    if (kDebugMode) {
      debugPrint('[Analytics] $name: $parameters');
    }
    if (!_initialized) return;
    try {
      final sanitized = parameters == null
          ? null
          : Map<String, Object>.fromEntries(
              parameters.entries.where((e) => e.value != null).cast<MapEntry<String, Object>>(),
            );
      await _analytics!.logEvent(name: name, parameters: sanitized);
    } catch (e) {
      debugPrint('[Analytics] Failed to log $name: $e');
    }
  }

  Future<void> setUserId(String? userId) async {
    if (!_initialized) return;
    try {
      await _analytics!.setUserId(id: userId);
    } catch (e) {
      debugPrint('[Analytics] setUserId failed: $e');
    }
  }

  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    await logEvent(
      name: AnalyticsEvent.screenView,
      parameters: {
        AnalyticsParameter.screenName: screenName,
        if (screenClass != null) AnalyticsParameter.screenClass: screenClass,
      },
    );
  }

  Future<void> logLogin({
    required String email,
    required bool success,
    String? errorMessage,
  }) async {
    await logEvent(
      name: AnalyticsEvent.login,
      parameters: {
        AnalyticsParameter.email: _sanitizeEmail(email),
        AnalyticsParameter.success: success,
        if (errorMessage != null) AnalyticsParameter.errorMessage: errorMessage,
      },
    );
  }

  Future<void> logContentAction({
    required String event,
    required String itemType,
    String? itemId,
    bool? success,
    String? errorMessage,
  }) async {
    await logEvent(
      name: event,
      parameters: {
        AnalyticsParameter.itemType: itemType,
        if (itemId != null) AnalyticsParameter.itemId: itemId,
        if (success != null) AnalyticsParameter.success: success,
        if (errorMessage != null) AnalyticsParameter.errorMessage: errorMessage,
      },
    );
  }

  String _sanitizeEmail(String email) {
    return email.trim().toLowerCase();
  }
}
