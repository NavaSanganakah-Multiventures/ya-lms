import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';

import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../theme/app_theme.dart';

class LiveClassRealtimeKitScreen extends StatefulWidget {
  final String meetingId;
  final String title;

  const LiveClassRealtimeKitScreen({
    super.key,
    required this.meetingId,
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
    _prepareLiveClass();
  }

  Future<void> _prepareLiveClass() async {
    final pipSupported = await PictureInPictureService.isSupported();
    if (mounted) setState(() => _isPipSupported = pipSupported);
    await _loadRealtimeKitMeeting();
  }

  Future<void> _loadRealtimeKitMeeting() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.meetingId.trim().isEmpty) {
        throw Exception('Live class meeting ID missing hai.');
      }

      final response = await ApiService.getLiveClassToken(widget.meetingId);
      final data = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200) {
        throw Exception(data['error'] ?? 'Live class token generate nahi ho paya.');
      }

      final token = data['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('RealtimeKit auth token empty mila.');
      }

      final meetingInfo = RtkMeetingInfo(authToken: token);
      final realtimeKitUIInfo = RealtimeKitUIInfo(
        meetingInfo,
        designToken: RtkDesignTokens(
          colorToken: RtkColorToken(
            brandColor: AppTheme.primary,
            backgroundColor: AppTheme.background,
            textOnBackground: Colors.white,
            textOnBrand: Colors.white,
            danger: AppTheme.danger,
            success: AppTheme.success,
            warning: AppTheme.primaryLight,
          ),
        ),
      );
      final meetingUi = RealtimeKitUIBuilder.build(uiKitInfo: realtimeKitUIInfo);

      if (!mounted) return;
      setState(() {
        _meetingUi = meetingUi;
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

    // When the student presses Home / switches apps during a live class,
    // move the activity into Android PiP so the native RealtimeKit meeting UI
    // keeps the class visible instead of leaving the session abruptly.
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
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _handleBackPressed();
      },
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          automaticallyImplyLeading: false,
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
            ),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(
                _isPipSupported && _meetingUi != null
                    ? 'RealtimeKit class mini player support ke saath'
                    : 'Native RealtimeKit live classroom',
                style: const TextStyle(
                  color: AppTheme.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
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
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.picture_in_picture_alt),
              ),
            if (_errorMessage != null)
              IconButton(
                tooltip: 'Retry',
                onPressed: _loadRealtimeKitMeeting,
                icon: const Icon(Icons.refresh),
              ),
            IconButton(
              tooltip: 'Exit live class',
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close),
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
