import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';

import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../theme/app_theme.dart';

class LiveClassRealtimeKitScreen extends StatefulWidget {
  final String? meetingId;
  final String? sessionId;
  final String title;

  const LiveClassRealtimeKitScreen({
    super.key,
    this.meetingId,
    this.sessionId,
    required this.title,
  });

  @override
  State<LiveClassRealtimeKitScreen> createState() => _LiveClassRealtimeKitScreenState();
}

class _LiveClassRealtimeKitScreenState extends State<LiveClassRealtimeKitScreen>
    with WidgetsBindingObserver {
  Widget? _meetingUi;
  String? _errorMessage;
  var _isLoading = true;
  var _isPipSupported = false;
  var _isEnteringPip = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPipSupport();
    _loadRealtimeKitMeeting();
  }

  Future<void> _checkPipSupport() async {
    try {
      final supported = await PictureInPictureService.isSupported()
          .timeout(const Duration(seconds: 3), onTimeout: () => false);
      if (mounted) setState(() => _isPipSupported = supported);
    } catch (_) {
      // PIP not critical — silently degrade
    }
  }

  Map<String, dynamic> _decodeResponseBody(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {
    }
    return {
      'message': body.trim().isNotEmpty
          ? body.trim()
          : 'Server se valid response nahi mila.',
    };
  }

  String _readApiError(Map<String, dynamic> data) {
    final message = data['message'] ?? data['error'] ?? data['details'];
    final text = message?.toString().trim();
    return text == null || text.isEmpty
        ? 'Live class token generate nahi ho paya.'
        : text;
  }

  Future<void> _loadRealtimeKitMeeting() async {
    debugPrint('[LIVE] _loadRealtimeKitMeeting started');
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final meetingId = widget.meetingId?.trim() ?? '';
      final sessionId = widget.sessionId?.trim() ?? '';
      if (meetingId.isEmpty && sessionId.isEmpty) {
        throw Exception('Live class meeting/session ID missing hai.');
      }

      debugPrint('[LIVE] Calling getLiveClassToken...');
      final response = await ApiService.getLiveClassToken(
        meetingId: meetingId,
        sessionId: sessionId,
      ).timeout(
        const Duration(seconds: 25),
        onTimeout: () => throw Exception('Server se response nahi aaya (25s timeout). Kripya dobara try karein.'),
      );
      debugPrint('[LIVE] Token response status: ${response.statusCode}');

      final data = _decodeResponseBody(response.body);

      if (response.statusCode != 200) {
        throw Exception(_readApiError(data));
      }

      final token = data['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('RealtimeKit auth token empty mila.');
      }

      debugPrint('[LIVE] Token obtained, building RealtimeKit UI...');
      final meetingInfo = RtkMeetingInfo(authToken: token);
      final realtimeKitUIInfo = RealtimeKitUIInfo(
        meetingInfo,
        designToken: RtkDesignTokens(
          colorToken: RtkColorToken(
            brandColor: const Color(0xFF5B5FC7),
            backgroundColor: const Color(0xFF1F1F1F),
            textOnBackground: Colors.white,
            textOnBrand: Colors.white,
            danger: const Color(0xFFC4314B),
            success: const Color(0xFF107C41),
            warning: const Color(0xFFF2C811),
          ),
        ),
      );
      final meetingUi = RealtimeKitUIBuilder.build(uiKitInfo: realtimeKitUIInfo);

      if (!mounted) return;
      debugPrint('[LIVE] UI ready, switching to meeting view');
      setState(() {
        _meetingUi = meetingUi;
        _isLoading = false;
      });
    } catch (error) {
      debugPrint('[LIVE] Error: $error');
      if (!mounted) return;
      setState(() {
        _errorMessage = error.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  Future<bool> _enterPictureInPicture({bool showMessage = false}) async {
    if (_isEnteringPip) return true;
    setState(() => _isEnteringPip = true);
    final didEnter = await PictureInPictureService.enter();
    if (mounted) setState(() => _isEnteringPip = false);

    if (!didEnter && showMessage && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Is device par Picture-in-Picture support nahi hai.'),
        ),
      );
    }
    return didEnter;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (!_isPipSupported || _meetingUi == null) return;

    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _enterPictureInPicture();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    RealtimeKitUIBuilder.dispose();
    super.dispose();
  }

  Future<void> _handleBackPressed() async {
    if (_isPipSupported && _meetingUi != null) {
      final didEnter = await _enterPictureInPicture(showMessage: true);
      if (didEnter) return;
    }
    _leaveClass();
  }

  Future<void> _leaveClass() async {
    if (widget.meetingId != null && widget.meetingId!.isNotEmpty) {
      try {
        await ApiService.leaveLiveClass(widget.meetingId!);
      } catch (_) {
      }
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        _handleBackPressed();
        return false;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF1F1F1F),
        appBar: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor: const Color(0xFF141414),
          elevation: 0,
          leading: IconButton(
            tooltip: _isPipSupported && _meetingUi != null ? 'Mini player' : 'Back',
            onPressed: () async {
              if (_isPipSupported && _meetingUi != null) {
                await _enterPictureInPicture(showMessage: true);
              } else if (mounted) {
                Navigator.of(context).maybePop();
              }
            },
            icon: Icon(
              _isPipSupported && _meetingUi != null
                  ? Icons.picture_in_picture_alt
                  : Icons.arrow_back,
              color: Colors.white,
            ),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(color: Color(0xFFC4314B), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Meeting in progress',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            if (_isPipSupported && _meetingUi != null)
              IconButton(
                tooltip: 'Open mini player',
                onPressed: _isEnteringPip
                    ? null
                    : () => _enterPictureInPicture(showMessage: true),
                icon: _isEnteringPip
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF5B5FC7)),
                      )
                    : const Icon(Icons.picture_in_picture_alt, color: Colors.white),
              ),
            if (_errorMessage != null)
              IconButton(
                tooltip: 'Retry',
                onPressed: _loadRealtimeKitMeeting,
                icon: const Icon(Icons.refresh, color: Colors.white),
              ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFC4314B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _leaveClass,
                child: const Text('Leave', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: _isLoading
              ? const _LiveClassLoading()
              : _errorMessage != null
                  ? _LiveClassError(message: _errorMessage!, onRetry: _loadRealtimeKitMeeting)
                  : _meetingUi ?? _LiveClassError(
                      message: 'RealtimeKit UI initialize nahi ho paya.',
                      onRetry: _loadRealtimeKitMeeting,
                    ),
        ),
      ),
    );
  }
}

class _LiveClassLoading extends StatelessWidget {
  const _LiveClassLoading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: AppTheme.primary),
          SizedBox(height: 16),
          Text(
            'RealtimeKit live classroom ready ho raha hai...',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _LiveClassError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _LiveClassError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(20),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.elevated,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.video_call_outlined, color: AppTheme.danger, size: 42),
            const SizedBox(height: 12),
            const Text(
              'Live classroom open nahi ho paya',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: const TextStyle(color: AppTheme.muted, height: 1.4),
              textAlign: TextAlign.center,
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
