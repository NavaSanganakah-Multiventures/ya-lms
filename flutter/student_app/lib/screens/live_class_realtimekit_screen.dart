import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../theme/app_theme.dart';
import 'wallet_screen.dart';

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
  var _is402Error = false;
  int _maxMinutes = -1;
  int _elapsedSeconds = 0;
  Timer? _timer;
  bool _isTimeWarningShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _prepareLiveClass();
  }

  Future<void> _prepareLiveClass() async {
    await [Permission.camera, Permission.microphone].request();
    final pipSupported = await PictureInPictureService.isSupported();
    if (mounted) setState(() => _isPipSupported = pipSupported);
    await _loadRealtimeKitMeeting();
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

  void _startTimer(int maxMinutes) {
    _timer?.cancel();
    _elapsedSeconds = 0;
    _maxMinutes = maxMinutes;
    _isTimeWarningShown = false;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) { timer.cancel(); return; }
      setState(() { _elapsedSeconds++; });

      final remaining = (maxMinutes * 60) - _elapsedSeconds;

      if (remaining <= 0) {
        timer.cancel();
        _handleTimeUp();
      } else if (remaining <= 60 && !_isTimeWarningShown) {
        _isTimeWarningShown = true;
        _showLowCreditWarning();
      }
    });
  }

  void _handleTimeUp() {
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1F1F1F),
        title: const Row(
          children: [
            Icon(Icons.timer_off_rounded, color: Color(0xFFC4314B), size: 28),
            SizedBox(width: 12),
            Text('Time Up', style: TextStyle(color: Colors.white)),
          ],
        ),
        content: const Text(
          'Aapke live class credits khatam ho gaye hain. Class leave karna hoga.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFC4314B)),
            onPressed: () {
              Navigator.of(ctx).pop();
              _leaveClass();
            },
            child: const Text('Leave Class'),
          ),
        ],
      ),
    );
  }

  void _showLowCreditWarning() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Sirf 1 minute bacha hai! Credits khatam hone wale hain.')),
          ],
        ),
        backgroundColor: Colors.orange.shade800,
        duration: const Duration(seconds: 6),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _loadRealtimeKitMeeting() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _is402Error = false;
    });

    try {
      final meetingId = widget.meetingId?.trim() ?? '';
      final sessionId = widget.sessionId?.trim() ?? '';
      debugPrint('LIVE_CLASS: Meeting ID: $meetingId, Session ID: $sessionId');

      if (meetingId.isEmpty && sessionId.isEmpty) {
        throw Exception('Live class meeting/session ID missing hai.');
      }

      debugPrint('LIVE_CLASS: Fetching token from API...');
      final response = await ApiService.getLiveClassToken(
        meetingId: meetingId,
        sessionId: sessionId,
      );
      final data = _decodeResponseBody(response.body);

      if (response.statusCode == 402) {
        if (mounted) {
          setState(() {
            _errorMessage = _readApiError(data);
            _is402Error = true;
            _isLoading = false;
          });
        }
        return;
      }
      if (response.statusCode != 200) {
        throw Exception(_readApiError(data));
      }

      final token = data['token']?.toString();
      if (token == null || token.isEmpty) {
        throw Exception('RealtimeKit auth token empty mila.');
      }
      debugPrint('LIVE_CLASS: Token fetched successfully. Initializing RealtimeKit...');

      final maxMin = data['maxMinutes'];
      if (maxMin != null) {
        final parsed = maxMin is int ? maxMin : (maxMin is double ? maxMin.toInt() : int.tryParse(maxMin.toString()));
        if (parsed != null && parsed > 0) {
          _startTimer(parsed);
        }
      }

      try {
        final payload = token.split('.')[1];
        final normalized = base64.normalize(payload);
        final decoded = utf8.decode(base64.decode(normalized));
        debugPrint('LIVE_CLASS: Token Payload: $decoded');
      } catch (e) {
        debugPrint('LIVE_CLASS: Failed to decode token: $e');
      }

      final meetingInfo = RtkMeetingInfo(
        authToken: token,
        enableAudio: true,
        enableVideo: true,
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
            danger: const Color(0xFFC4314B),
            success: const Color(0xFF107C41),
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

  int get _remainingSeconds {
    if (_maxMinutes <= 0) return -1;
    final remaining = (_maxMinutes * 60) - _elapsedSeconds;
    return remaining > 0 ? remaining : 0;
  }

  String _formatTime(int totalSeconds) {
    if (totalSeconds < 0) return '';
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
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
    _timer?.cancel();
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
    _timer?.cancel();
    if ((widget.meetingId != null && widget.meetingId!.isNotEmpty) || (widget.sessionId != null && widget.sessionId!.isNotEmpty)) {
      try {
        await ApiService.leaveLiveClass(meetingId: widget.meetingId, sessionId: widget.sessionId);
      } catch (_) {
      }
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final remaining = _remainingSeconds;
    final isLow = remaining > 0 && remaining <= 120;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        _handleBackPressed();
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
                    style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w400),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            if (remaining > 0)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isLow ? const Color(0xFFC4314B).withAlpha(40) : Colors.white.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                      border: isLow ? Border.all(color: const Color(0xFFC4314B).withAlpha(80)) : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isLow ? Icons.timer_off_rounded : Icons.timer_outlined,
                          color: isLow ? const Color(0xFFC4314B) : Colors.white70,
                          size: 14,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _formatTime(remaining),
                          style: TextStyle(
                            color: isLow ? const Color(0xFFC4314B) : Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
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
        body: _isLoading
          ? const _LiveClassLoading()
          : _errorMessage != null
              ? _LiveClassError(
                  message: _errorMessage!,
                  onRetry: _loadRealtimeKitMeeting,
                  is402Error: _is402Error,
                )
              : _meetingUi != null
                  ? SizedBox.expand(child: _meetingUi!)
                  : _LiveClassError(
                      message: 'RealtimeKit UI initialize nahi ho paya.',
                      onRetry: _loadRealtimeKitMeeting,
                      is402Error: false,
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
  final bool is402Error;

  const _LiveClassError({required this.message, required this.onRetry, this.is402Error = false});

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
            if (is402Error)
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const WalletScreen()));
                },
                icon: const Icon(Icons.account_balance_wallet),
                label: const Text('Buy Credits'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
              )
            else
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
