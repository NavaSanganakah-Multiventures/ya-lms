import 'package:flutter/material.dart';
import '../screens/main_layout.dart';
import '../screens/wallet_screen.dart';
import '../screens/subscription_screen.dart';
import '../screens/quiz_list_screen.dart';
import '../screens/course_detail_screen.dart';
import '../screens/live_class_realtimekit_screen.dart';

/// Routes push notification / in-app notification taps to the correct screen.
class NotificationRouter {
 static final GlobalKey<NavigatorState> navigatorKey =
 GlobalKey<NavigatorState>();

 static NavigatorState? get _navigator => navigatorKey.currentState;

 static void handleTap(String url, Map<String, dynamic> data) {
 debugPrint('[NotificationRouter] tap url=$url data=$data');

 final uri = Uri.tryParse(url);
 final path = uri?.path ?? url;
 final segments = path
 .split('/')
 .where((s) => s.isNotEmpty)
 .toList();

 if (segments.isEmpty) {
 _pushReplacement( MainLayoutScreen());
 return;
 }

 switch (segments.first) {
 case 'dashboard':
 case 'home':
 _pushReplacement( MainLayoutScreen());
 break;
 case 'wallet':
 _push( WalletScreen());
 break;
 case 'subscription':
 case 'subscriptions':
 _push( SubscriptionScreen());
 break;
 case 'quiz':
 case 'quizzes':
 case 'exams':
 _push( QuizListScreen());
 break;
 case 'course':
 case 'courses':
 _openCourse(data, segments);
 break;
 case 'live':
 case 'live-class':
 case 'live_class':
 _openLiveClass(data);
 break;
 default:
 // Unknown route — fall back to dashboard.
 _pushReplacement( MainLayoutScreen());
 }
 }

 static void _pushReplacement(Widget screen) {
 final nav = _navigator;
 if (nav == null) return;
 nav.pushAndRemoveUntil(
 MaterialPageRoute(builder: (_) => screen),
 (route) => false,
 );
 }

 static void _push(Widget screen) {
 final nav = _navigator;
 if (nav == null) return;
 nav.push(MaterialPageRoute(builder: (_) => screen));
 }

 static void _openCourse(Map<String, dynamic> data, List<String> segments) {
 final Map<String, dynamic> course;
 if (data['course'] is Map) {
 course = Map<String, dynamic>.from(data['course'] as Map);
 } else {
 course = <String, dynamic>{};
 }

 // Prefer course id from URL path if provided.
 if (segments.length >= 2) {
 course['id'] = segments.last;
 }

 if (course['id'] == null && course['slug'] == null) {
 // Fallback to dashboard if we cannot build a course screen.
 _pushReplacement( MainLayoutScreen());
 return;
 }

 _push(CourseDetailScreen(
 course: course,
 isEnrolled: data['isEnrolled'] == true || data['enrolled'] == true,
 ));
 }

 static void _openLiveClass(Map<String, dynamic> data) {
 final meetingId = data['meetingId']?.toString() ?? data['meeting_id']?.toString();
 final sessionId = data['sessionId']?.toString() ?? data['session_id']?.toString();
 final title = data['title']?.toString() ?? 'Live Class';
 final requiredCredits = int.tryParse(data['required_credits']?.toString() ?? '0') ?? 0;

 if (meetingId == null && sessionId == null) {
 _pushReplacement( MainLayoutScreen());
 return;
 }

 _push(LiveClassRealtimeKitScreen(
 meetingId: meetingId,
 sessionId: sessionId,
 title: title,
 requiredCredits: requiredCredits,
 ));
 }
}
