import 'dart:async';

import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';
import 'package:permission_handler/permission_handler.dart';

import '../services/api_service.dart';
import '../services/picture_in_picture_service.dart';
import '../services/live_class_pip_manager.dart';
import '../theme/app_theme.dart';
import 'wallet_screen.dart';

class LiveClassRealtimeKitScreen extends StatefulWidget {
 final String? meetingId;
 final String? sessionId;
 final String title;
 final int requiredCredits;

 LiveClassRealtimeKitScreen({
 super.key,
 this.meetingId,
 this.sessionId,
 required this.title,
 this.requiredCredits = 0,
 });

 @override
 State<LiveClassRealtimeKitScreen> createState() => _LiveClassRealtimeKitScreenState();
}

class _LiveClassRealtimeKitScreenState extends State<LiveClassRealtimeKitScreen>
 with WidgetsBindingObserver {
 final LiveClassPipManager _pip = LiveClassPipManager.instance;
 Widget? _meetingUi;
 String? _errorMessage;
 var _isLoading = true;
 var _isPipSupported = false;
 var _isEnteringPip = false;
 var _is402Error = false;
 var _isGoingToMini = false;
 int _maxMinutes = -1;
 int _elapsedSeconds = 0;
 Timer? _timer;
 bool _isTimeWarningShown = false;

 @override
 void initState() {
 super.initState();
 WidgetsBinding.instance.addObserver(this);
 _prepareLiveClass().catchError((Object error) {
 debugPrint('LIVE_CLASS: _prepareLiveClass error: $error');
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
 final pipSupported = await PictureInPictureService.isSupported();
 if (mounted) setState(() => _isPipSupported = pipSupported);

 await _loadRealtimeKitMeeting();
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
 _timer = Timer.periodic( Duration(seconds: 1), (timer) {
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
 
 setState(() {
 _meetingUi = null;
 });

 _leaveClass();

 showDialog(
 context: context,
 barrierDismissible: false,
 builder: (ctx) => AlertDialog(
 backgroundColor: Color(0xFF1F1F1F),
 title: Row(
 children: [
 Icon(Icons.timer_off_rounded, color: Color(0xFFC4314B), size: 28),
 SizedBox(width: 12),
 Text('Time Up', style: TextStyle(color: Colors.white)),
 ],
 ),
 content: Text(
 'Aapke live class credits khatam ho gaye hain.',
 style: TextStyle(color: Colors.white70),
 ),
 actions: [
 ElevatedButton(
 style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFC4314B)),
 onPressed: () {
 Navigator.of(ctx).pop();
 if (mounted) Navigator.of(context).pop();
 },
 child: Text('Okay'),
 ),
 ],
 ),
 );
 }

 void _showLowCreditWarning() {
 if (!mounted) return;
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Row(
 children: [
 Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
 SizedBox(width: 10),
 Expanded(child: Text('Sirf 1 minute bacha hai! Credits khatam hone wale hain.')),
 ],
 ),
 backgroundColor: Colors.orange.shade800,
 duration: Duration(seconds: 6),
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
 final data = response.data;

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

 final maxMin = data['maxMinutes'];
 if (maxMin != null) {
 final parsed = maxMin is int ? maxMin : (maxMin is double ? maxMin.toInt() : int.tryParse(maxMin.toString()));
 if (parsed != null && parsed > 0) {
 _startTimer(parsed);
 }
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
 brandColor: Color(0xFF5B5FC7),
 backgroundColor: Color(0xFF1F1F1F),
 textOnBackground: Colors.white,
 textOnBrand: Colors.white,
 danger: Color(0xFFC4314B),
 success: Color(0xFF107C41),
 warning: Color(0xFFF2C811),
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
 // Register with the global PipManager
 _pip.startLiveClass(
 meetingWidget: meetingWidget,
 title: widget.title,
 meetingId: widget.meetingId,
 sessionId: widget.sessionId,
 maxMinutes: _maxMinutes,
 );
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
 SnackBar(
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

 // Only enter PiP on paused (when actually moving to background)
 // inactive can trigger just by pulling down notification shade
 if (state == AppLifecycleState.paused) {
 _enterPictureInPicture();
 }
 }

 @override
 void dispose() {
 _timer?.cancel();
 WidgetsBinding.instance.removeObserver(this);
 if (!_isGoingToMini) {
 RealtimeKitUIBuilder.dispose();
 }
 super.dispose();
 }

 Future<void> _handleBackPressed() async {
    if (_isPipSupported && _meetingUi != null) {
      final didEnter = await _enterPictureInPicture(showMessage: true);
      if (didEnter) return;
    }
    if (!mounted) return;
    _isGoingToMini = true;
    _pip.enterMiniPlayer();
    Navigator.of(context).pop();
  }

 Future<void> _leaveClass() async {
 _timer?.cancel();
 _pip.stopLiveClass();
 if ((widget.meetingId != null && widget.meetingId!.isNotEmpty) || (widget.sessionId != null && widget.sessionId!.isNotEmpty)) {
 try {
 await ApiService.leaveLiveClass(meetingId: widget.meetingId, sessionId: widget.sessionId);
 } catch (e) {
 debugPrint('LIVE_CLASS: Leave API call failed: $e');
 if (mounted) {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(
 content: Text('Leave API failed: $e'),
 backgroundColor: AppTheme.danger,
 ),
 );
 }
 }
 }
 if (!mounted) return;
    Navigator.of(context).pop();
 }

 @override
 Widget build(BuildContext context) {
 final remaining = _remainingSeconds;
 final isLow = remaining > 0 && remaining <= 120;

 return PopScope(
 canPop: false,
 onPopInvokedWithResult: (didPop, result) async {
 if (didPop) return;
 await _handleBackPressed();
 },
 child: Scaffold(
 backgroundColor: Color(0xFF1F1F1F),
 appBar: AppBar(
 automaticallyImplyLeading: false,
 backgroundColor: Color(0xFF141414),
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
 Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
 Row(
 children: [
 Container(
 width: 6,
 height: 6,
 decoration: BoxDecoration(color: Color(0xFFC4314B), shape: BoxShape.circle),
 ),
 SizedBox(width: 6),
 Text(
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
 padding: EdgeInsets.symmetric(horizontal: 4),
 child: Center(
 child: Container(
 padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
 decoration: BoxDecoration(
 color: isLow ? Color(0xFFC4314B).withAlpha(40) : Colors.white.withAlpha(20),
 borderRadius: BorderRadius.circular(12),
 border: isLow ? Border.all(color: Color(0xFFC4314B).withAlpha(80)) : null,
 ),
 child: Row(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(
 isLow ? Icons.timer_off_rounded : Icons.timer_outlined,
 color: isLow ? Color(0xFFC4314B) : Colors.white70,
 size: 14,
 ),
 SizedBox(width: 4),
 Text(
 _formatTime(remaining),
 style: TextStyle(
 color: isLow ? Color(0xFFC4314B) : Colors.white70,
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
 ? SizedBox(
 height: 20,
 width: 20,
 child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF5B5FC7)),
 )
 : Icon(Icons.picture_in_picture_alt, color: Colors.white),
 ),
 if (_errorMessage != null)
 IconButton(
 tooltip: 'Retry',
 onPressed: _loadRealtimeKitMeeting,
 icon: Icon(Icons.refresh, color: Colors.white),
 ),
 Container(
 margin: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
 child: ElevatedButton(
 style: ElevatedButton.styleFrom(
 backgroundColor: Color(0xFFC4314B),
 foregroundColor: Colors.white,
 minimumSize: Size(80, 36),
 padding: EdgeInsets.symmetric(horizontal: 16),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
 ),
 onPressed: _leaveClass,
 child: Text('Leave', style: TextStyle(fontWeight: FontWeight.w600)),
 ),
 ),
 ],
 ),
 body: _isLoading
 ? _LiveClassLoading()
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
 _LiveClassLoading();

 @override
 Widget build(BuildContext context) {
 return Center(
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

 _LiveClassError({required this.message, required this.onRetry, this.is402Error = false});

 @override
 Widget build(BuildContext context) {
 return Center(
 child: Container(
 margin: EdgeInsets.all(20),
 padding: EdgeInsets.all(18),
 decoration: BoxDecoration(
 color: AppTheme.elevatedOf(context),
 borderRadius: BorderRadius.circular(20),
 border: Border.all(color: Colors.white24),
 ),
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 Icon(Icons.video_call_outlined, color: AppTheme.danger, size: 42),
 SizedBox(height: 12),
 Text(
 'Live classroom open nahi ho paya',
 style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
 textAlign: TextAlign.center,
 ),
 SizedBox(height: 8),
 Text(
 message,
 style: TextStyle(color: AppTheme.mutedOf(context), height: 1.4),
 textAlign: TextAlign.center,
 maxLines: 4,
 overflow: TextOverflow.ellipsis,
 ),
 SizedBox(height: 16),
 if (is402Error)
 ElevatedButton.icon(
 onPressed: () {
 Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => WalletScreen()));
 },
 icon: Icon(Icons.account_balance_wallet),
 label: Text('Buy Credits'),
 style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary, foregroundColor: Colors.white),
 )
 else
 ElevatedButton.icon(
 onPressed: onRetry,
 icon: Icon(Icons.refresh),
 label: Text('Try again'),
 ),
 ],
 ),
 ),
 );
 }
}