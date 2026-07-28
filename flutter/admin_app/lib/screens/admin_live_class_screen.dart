import 'dart:async';

import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/admin_api_service.dart';
import '../theme/app_theme.dart';

/// Native RealtimeKit live class screen for admin/teacher.
/// Admin joins as host ("group_call_host" preset) — no credit gating.
class AdminLiveClassScreen extends StatefulWidget {
  final String? meetingId;
  final String? sessionId;
  final String title;

  const AdminLiveClassScreen({
    super.key,
    this.meetingId,
    this.sessionId,
    required this.title,
  });

  @override
  State<AdminLiveClassScreen> createState() => _AdminLiveClassScreenState();
}

class _AdminLiveClassScreenState extends State<AdminLiveClassScreen> {
  Widget? _meetingUi;
  String? _errorMessage;
  var _isLoading = true;

  @override
  void initState() {
    super.initState();
    _prepareLiveClass().catchError((Object error) {
      debugPrint('ADMIN_LIVE_CLASS: _prepareLiveClass error: $error');
      if (mounted) {
        setState(() {
          _errorMessage = 'Live class start nahi ho paya: $error';
          _isLoading = false;
        });
      }
    });
  }

  Future<void> _prepareLiveClass() async {
    await [Permission.camera, Permission.microphone].request();
    await _loadRealtimeKitMeeting();
  }

  String _readApiError(Map<String, dynamic> data) {
    final message = data['message'] ?? data['error'] ?? data['details'];
    final text = message?.toString().trim();
    return text == null || text.isEmpty
        ? 'Live class token generate nahi ho paya.'
        : text;
  }

  Future<void> _loadRealtimeKitMeeting() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final meetingId = widget.meetingId?.trim() ?? '';
      final sessionId = widget.sessionId?.trim() ?? '';
      debugPrint('ADMIN_LIVE_CLASS: Meeting ID: $meetingId, Session ID: $sessionId');

      if (meetingId.isEmpty && sessionId.isEmpty) {
        throw Exception('Live class meeting/session ID missing hai.');
      }

      debugPrint('ADMIN_LIVE_CLASS: Fetching token from API...');
      final response = await AdminApiService.getLiveClassToken(
        meetingId: meetingId,
        sessionId: sessionId,
      );
      final data = response.data;

      if (response.statusCode != 200) {
        throw Exception(_readApiError(data));
      }

      final token = data['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('RealtimeKit auth token empty mila.');
      }

      final meetingInfo = RtkMeetingInfo(
        authToken: token,
        enableAudio: false,
        enableVideo: false,
        baseDomain: 'realtime.cloudflare.com',
      );
      final realtimeKitUIInfo = RealtimeKitUIInfo(
        meetingInfo,
        designToken: RtkDesignTokens(
          colorToken: RtkColorToken(
            brandColor: const Color(0xFF5B5FC7),
            backgroundColor: const Color(0xFF1F1F1F),
            textOnBackground: Colors.white,
            textOnBrand: Colors.white,
            danger: AppTheme.danger,
            success: AppTheme.success,
            warning: const Color(0xFFF2C811),
          ),
        ),
      );
      final meetingWidget = RealtimeKitUIBuilder.build(
        uiKitInfo: realtimeKitUIInfo,
        skipSetupPage: true,
      );

      if (!mounted) return;
      setState(() {
        _meetingUi = meetingWidget;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<void> _leaveClass() async {
    RealtimeKitUIBuilder.dispose();
    if ((widget.meetingId != null && widget.meetingId!.isNotEmpty) ||
        (widget.sessionId != null && widget.sessionId!.isNotEmpty)) {
      try {
        await AdminApiService.leaveLiveClass(
          meetingId: widget.meetingId,
          sessionId: widget.sessionId,
        );
      } catch (e) {
        debugPrint('ADMIN_LIVE_CLASS: Leave API call failed: $e');
      }
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    RealtimeKitUIBuilder.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await _leaveClass();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF1F1F1F),
        appBar: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor: const Color(0xFF141414),
          elevation: 0,
          leading: IconButton(
            tooltip: 'Leave',
            onPressed: _leaveClass,
            icon: const Icon(Icons.arrow_back, color: Colors.white),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.admin_panel_settings, color: AppTheme.danger, size: 14),
                  SizedBox(width: 6),
                  Text(
                    'Admin Host',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.danger,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(80, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                onPressed: _leaveClass,
                child: const Text(
                  'Leave',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
        body: _isLoading
            ? const _AdminLiveClassLoading()
            : _errorMessage != null
                ? _AdminLiveClassError(
                    message: _errorMessage!,
                    onRetry: _loadRealtimeKitMeeting,
                  )
                : _meetingUi != null
                    ? SizedBox.expand(child: _meetingUi!)
                    : _AdminLiveClassError(
                        message: 'RealtimeKit UI initialize nahi ho paya.',
                        onRetry: _loadRealtimeKitMeeting,
                      ),
      ),
    );
  }
}

class _AdminLiveClassLoading extends StatelessWidget {
  const _AdminLiveClassLoading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: AppTheme.primary),
          SizedBox(height: 16),
          Text(
            'Live classroom ready ho raha hai...',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _AdminLiveClassError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _AdminLiveClassError({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(20),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.elevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.video_call_outlined, color: AppTheme.danger, size: 42),
            const SizedBox(height: 12),
            const Text(
              'Live classroom open nahi ho paya',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: const TextStyle(color: AppTheme.muted, height: 1.4),
              textAlign: TextAlign.center,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}
