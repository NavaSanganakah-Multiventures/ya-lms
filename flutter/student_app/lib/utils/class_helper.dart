import 'package:flutter/material.dart';
import '../screens/live_class_realtimekit_screen.dart';

class ClassHelper {
  static String readSessionValue(Map<String, dynamic> session, List<String> keys) {
    for (final key in keys) {
      final value = session[key]?.toString().trim();
      if (value != null && value.isNotEmpty && value != 'null') return value;
    }
    return '';
  }

  static void joinLiveClass(BuildContext context, Map<String, dynamic> session, {String? defaultTitle}) {
    final meetingId = readSessionValue(session, [
      'rtc_room_id',
      'meetingId',
      'meeting_id',
      'roomId',
      'room_id',
    ]);
    final sessionId = readSessionValue(session, [
      'id',
      'sessionId',
      'session_id',
    ]);
    
    if (meetingId.isEmpty && sessionId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Live class session ID missing है')),
      );
      return;
    }

    final title = (session['title'] ?? defaultTitle ?? 'Live Class').toString();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LiveClassRealtimeKitScreen(
          meetingId: meetingId.isEmpty ? null : meetingId,
          sessionId: sessionId.isEmpty ? null : sessionId,
          title: title,
        ),
      ),
    );
  }
}
