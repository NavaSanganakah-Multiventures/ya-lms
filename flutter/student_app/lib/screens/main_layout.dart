import 'dart:async';
import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/live_class_pip_manager.dart';
import '../services/picture_in_picture_service.dart';
import '../services/real_time_service.dart';
import 'dashboard_screen.dart';
import 'books_screen.dart';
import 'wallet_screen.dart';
import 'profile_screen.dart';
import 'yagya_mitra_screen.dart';
import 'live_class_realtimekit_screen.dart';
import '../utils/responsive.dart';

class MainLayoutScreen extends StatefulWidget {
 MainLayoutScreen({super.key});

 @override
 State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen>
 with WidgetsBindingObserver {
 int _currentIndex = 0;
 int _refreshCounter = 0;
 int _unreadCount = 0;
 Timer? _notificationTimer;

 // ── Live Class PiP ──────────────────────────────────────────
 final LiveClassPipManager _pip = LiveClassPipManager.instance;
 bool _pipSupported = false;

 List<Widget> get _screens => [
 DashboardScreen(key: ValueKey('dashboard_$_refreshCounter')),
 BooksScreen(key: ValueKey('books_$_refreshCounter')),
 YagyaMitraScreen(),
 WalletScreen(),
 ProfileScreen(),
 ];

 late final StreamSubscription? _realtimeSub;
 late final StreamSubscription? _connectionSub;
 bool _isRealtimeConnected = false;

 @override
 void initState() {
 super.initState();
 WidgetsBinding.instance.addObserver(this);
 _pip.addListener(_onPipChange);
 _fetchUnreadCount();
 _notificationTimer =
 Timer.periodic( Duration(seconds: 120), (_) => _fetchUnreadCount());
 _checkPipSupport();

 // Connect to WebSocket and listen for events
 RealTimeService.instance.connect();
 _connectionSub = RealTimeService.instance.connectionState.listen((connected) {
 if (mounted) setState(() => _isRealtimeConnected = connected);
 });
  _realtimeSub = RealTimeService.instance.dataStream.listen((event) {
  if (!mounted) return;
  final action = event['action'];
  final entity = event['entity'];
  if (action == 'course_published') {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('🚀 New Course Published: ${event['data']['title']}')),
    );
  } else if (entity == 'wallet' && action == 'wallet_updated') {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('💰 Wallet Balance Updated!')),
    );
  } else if (entity == 'notification' && action == 'new_notification') {
    _fetchUnreadCount();
  } else if (entity == 'user' && action == 'profile_updated') {
    context.read<AuthProvider>().refreshProfile();
  } else if (entity == 'broadcast' && action == 'new_broadcast') {
    final title = event['data']?['title'] ?? 'New Broadcast';
    final message = event['data']?['message'] ?? '';
    _showBroadcastDialog(title, message);
  }
  });
  }

  Future<void> _showBroadcastDialog(String title, String message) async {
  if (!mounted) return;
  await showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text('OK')),
      ],
    ),
  );
  }

 @override
 void dispose() {
 _connectionSub?.cancel();
 _realtimeSub?.cancel();
 RealTimeService.instance.disconnect();
 _notificationTimer?.cancel();
 _pip.removeListener(_onPipChange);
 WidgetsBinding.instance.removeObserver(this);
 super.dispose();
 }

 void _onPipChange() {
 if (mounted) setState(() {});
 }

 Future<void> _checkPipSupport() async {
 final supported = await PictureInPictureService.isSupported();
 if (mounted) setState(() => _pipSupported = supported);
 }

 // ── PiP auto-enter when app goes to background ──────────────
 @override
 void didChangeAppLifecycleState(AppLifecycleState state) {
 super.didChangeAppLifecycleState(state);
 if (state == AppLifecycleState.paused &&
 _pipSupported &&
 _pip.isActive &&
 _pip.mode == PipDisplayMode.fullScreen) {
 PictureInPictureService.enter();
 PictureInPictureService.updatePiPActions(micEnabled: _pip.micEnabled);
 }
 }

 Future<void> _fetchUnreadCount() async {
 try {
 final res = await ApiService.getNotifications();
 if (res.statusCode == 200 && mounted) {
 final data = res.data;
 setState(() {
 _unreadCount = data['unreadCount'] ?? 0;
 });
 }
 } catch (e) {
 debugPrint('_fetchUnreadCount failed: $e');
 }
 }

 void _refresh() {
 setState(() {
 _refreshCounter++;
 });
 }

 // ── Tap mini player → back to full screen ───────────────────
 void _openFullScreen() {
 _pip.enterFullScreen();
 // Navigator.push to the live class screen
 Navigator.push(
 context,
 MaterialPageRoute(
 builder: (_) => LiveClassRealtimeKitScreen(
 meetingId: _pip.meetingId,
 sessionId: _pip.sessionId,
 title: _pip.title,
 requiredCredits: _pip.maxMinutes,
 ),
 ),
 );
 }

 // ── Build ────────────────────────────────────────────────────
 @override
 Widget build(BuildContext context) {
 final titles = [
 'Student Dashboard',
 'Books Library',
 'Yagya Mitra',
 'My Wallet',
 'My Profile',
 ];

 return Scaffold(
 extendBodyBehindAppBar: true,
 appBar: AppBar(
 title: Text(titles[_currentIndex]),
 backgroundColor: AppTheme.backgroundOf(context).withAlphaOpacity(0.92),
 elevation: 0,
 actions: [
 // Real-time connection indicator
 Tooltip(
 message: _isRealtimeConnected ? 'Realtime connected' : 'Realtime disconnected',
 child: Container(
 width: 10,
 height: 10,
 margin: EdgeInsets.only(right: 4),
 decoration: BoxDecoration(
 color: _isRealtimeConnected ? AppTheme.success : AppTheme.mutedOf(context),
 shape: BoxShape.circle,
 boxShadow: _isRealtimeConnected
 ? [
 BoxShadow(
 color: AppTheme.success.withAlphaOpacity(0.5),
 blurRadius: 8,
 spreadRadius: 2,
 ),
 ]
 : null,
 ),
 ),
 ),
 Stack(
 children: [
 IconButton(
 icon: Icon(Icons.notifications_outlined),
 onPressed: () {},
 color: AppTheme.textPrimaryOf(context),
 ),
 if (_unreadCount > 0)
 Positioned(
 right: 6,
 top: 6,
 child: Container(
 padding: EdgeInsets.all(4),
 decoration: BoxDecoration(
 color: AppTheme.danger,
 shape: BoxShape.circle,
 ),
 constraints:
 BoxConstraints(minWidth: 18, minHeight: 18),
 child: Text(
 _unreadCount > 99 ? '99+' : _unreadCount.toString(),
 style: TextStyle(
 color: Colors.white,
 fontSize: 10,
 fontWeight: FontWeight.bold),
 textAlign: TextAlign.center,
 ),
 ),
 ),
 ],
 ),
 if (_currentIndex <= 1) ...[
 IconButton(
 tooltip: 'Refresh',
 icon: Icon(Icons.refresh_rounded),
 onPressed: _refresh,
 ),
 SizedBox(width: 8),
 ],
 ],
 ),
 body: Stack(
 children: [
 // Layer 1: Normal tab content
 IndexedStack(
 index: _currentIndex,
 children: _screens,
 ),

 // Layer 2: Mini player overlay (when live class is in mini mode)
 if (_pip.isMiniPlayerVisible) _buildMiniPlayer(),
 ],
 ),
 bottomNavigationBar: _buildBottomNav(),
 );
 }

 // ── Mini Player Widget ───────────────────────────────────────
 Widget _buildMiniPlayer() {
 return Positioned(
 left: 12,
 right: 12,
 bottom: isMobile(context) ? 72 : (isTablet(context) ? 80 : 88), // above bottom nav
 child: GestureDetector(
 onTap: _openFullScreen,
 child: Container(
 height: isMobile(context) ? 90 : (isTablet(context) ? 100 : 110),
 decoration: BoxDecoration(
 color: Color(0xFF1A1A2E),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.primaryLight.withAlpha(80)),
 boxShadow: [
 BoxShadow(
 color: Colors.black.withAlpha(80),
 blurRadius: 16,
 offset: Offset(0, 4),
 ),
 ],
 ),
 child: Row(
 children: [
 // Video placeholder / live indicator
 Container(
 width: isMobile(context) ? 90 : (isTablet(context) ? 100 : 120),
 decoration: BoxDecoration(
 color: Colors.black45,
 borderRadius: BorderRadius.horizontal(
 left: Radius.circular(16)),
 ),
 child: Center(
 child: Icon(Icons.videocam_rounded,
 color: Colors.white54, size: 32),
 ),
 ),
 SizedBox(width: 12),
 // Title + status
 Expanded(
 child: Column(
 mainAxisAlignment: MainAxisAlignment.center,
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(
 _pip.title,
 maxLines: 1,
 overflow: TextOverflow.ellipsis,
 style: TextStyle(
 color: Colors.white,
 fontWeight: FontWeight.bold,
 fontSize: 14,
 ),
 ),
 SizedBox(height: 4),
 Row(
 children: [
 Container(
 width: 8,
 height: 8,
 decoration: BoxDecoration(
 color: Colors.greenAccent,
 shape: BoxShape.circle,
 ),
 ),
 SizedBox(width: 6),
 Text(
 'Live',
 style: TextStyle(
 color: Colors.white70, fontSize: 12),
 ),
 ],
 ),
 ],
 ),
 ),
 // Mic toggle
 IconButton(
 icon: Icon(
 _pip.micEnabled
 ? Icons.mic_rounded
 : Icons.mic_off_rounded,
 color: _pip.micEnabled
 ? AppTheme.primaryLight
 : AppTheme.danger,
 ),
 onPressed: () {
 _pip.toggleMic();
 PictureInPictureService.updatePiPActions(
 micEnabled: _pip.micEnabled);
 },
 tooltip: _pip.micEnabled ? 'Mute Mic' : 'Unmute Mic',
 ),
 // Close / leave
 IconButton(
 icon: Icon(Icons.close, color: Colors.white54),
 onPressed: () {
 _pip.stopLiveClass();
 RealtimeKitUIBuilder.dispose();
 },
 tooltip: 'Leave Class',
 ),
 SizedBox(width: 4),
 ],
 ),
 ),
 ),
 );
 }

 // ── Bottom Navigation ────────────────────────────────────────
 Widget _buildBottomNav() {
 return Container(
 decoration: BoxDecoration(
 boxShadow: [
 BoxShadow(
 color: Colors.black.withAlpha(20),
 blurRadius: 20,
 offset: Offset(0, -5),
 ),
 ],
 ),
 child: ClipRRect(
 borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
 child: BottomAppBar(
 color: AppTheme.surfaceOf(context),
 elevation: 0,
 height: isMobile(context) ? 64 : (isTablet(context) ? 72 : 80),
 padding: EdgeInsets.zero,
 child: Row(
 mainAxisAlignment: MainAxisAlignment.spaceAround,
 children: [
 _navItem(
 index: 0, icon: Icons.dashboard_rounded, label: 'Home'),
 _navItem(
 index: 1,
 icon: Icons.library_books_rounded,
 label: 'Library'),
 _CenterNavItem(
 onTap: () => setState(() => _currentIndex = 2)),
 _navItem(
 index: 3,
 icon: Icons.account_balance_wallet_rounded,
 label: 'Wallet'),
 _navItem(
 index: 4,
 icon: Icons.account_circle_rounded,
 label: 'Profile'),
 ],
 ),
 ),
 ),
 );
 }

 Widget _navItem(
 {required int index, required IconData icon, required String label}) {
 final isSelected = _currentIndex == index;
 return Expanded(
 child: InkWell(
 onTap: () => setState(() => _currentIndex = index),
 borderRadius: BorderRadius.circular(16),
 child: Padding(
 padding: EdgeInsets.symmetric(vertical: 6),
 child: Column(
 mainAxisSize: MainAxisSize.min,
 children: [
 AnimatedContainer(
 duration: Duration(milliseconds: 200),
 padding: EdgeInsets.symmetric(horizontal: 14, vertical: 6),
 decoration: BoxDecoration(
 color: isSelected
 ? AppTheme.primary.withAlphaOpacity(0.12)
 : Colors.transparent,
 borderRadius: BorderRadius.circular(16),
 ),
 child: Icon(
 icon,
 color: isSelected ? AppTheme.primary : AppTheme.mutedOf(context),
 size: 22,
 ),
 ),
 SizedBox(height: 2),
 Text(
 label,
 style: TextStyle(
 color: isSelected ? AppTheme.primary : AppTheme.mutedOf(context),
 fontSize: 10,
 fontWeight:
 isSelected ? FontWeight.w800 : FontWeight.w500,
 ),
 ),
 ],
 ),
 ),
 ),
 );
 }
}

// ── Re-usable from original file ───────────────────────────────
class _CenterNavItem extends StatefulWidget {
 final VoidCallback onTap;
 _CenterNavItem({required this.onTap});

 @override
 State<_CenterNavItem> createState() => _CenterNavItemState();
}

class _CenterNavItemState extends State<_CenterNavItem>
 with SingleTickerProviderStateMixin {
 late AnimationController _pulseController;
 late Animation<double> _pulseAnimation;

 @override
 void initState() {
 super.initState();
 _pulseController = AnimationController(
 vsync: this,
 duration: Duration(milliseconds: 2000),
 )..repeat(reverse: true);
 _pulseAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
 CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
 );
 }

 @override
 void dispose() {
 _pulseController.dispose();
 super.dispose();
 }

 @override
 Widget build(BuildContext context) {
 return AnimatedBuilder(
 animation: _pulseAnimation,
 builder: (context, child) {
 final pulseValue = _pulseAnimation.value;
 final glowOpacity = 0.3 + (pulseValue * 0.4);
 final scale = 1.0 + (pulseValue * 0.04);
 return Transform.scale(
 scale: scale,
 child: Padding(
 padding: EdgeInsets.only(top: 0),
 child: InkWell(
 onTap: widget.onTap,
 borderRadius: BorderRadius.circular(28),
 child: Container(
 width: 60,
 height: 60,
 margin: EdgeInsets.only(bottom: 4),
 decoration: BoxDecoration(
 gradient: AppTheme.sacredGradient,
 shape: BoxShape.circle,
 boxShadow: [
 BoxShadow(
 color: AppTheme.primaryLight
 .withAlpha((80 * glowOpacity).round()),
 blurRadius: 12 + (pulseValue * 8),
 spreadRadius: 2 + (pulseValue * 4),
 ),
 ],
 ),
 child: Icon(
 Icons.smart_toy_rounded,
 color: Colors.white,
 size: 30,
 ),
 ),
 ),
 ),
 );
 },
 );
 }
}
