import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';
import '../theme/app_theme.dart';
import '../providers/auth_provider.dart';
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
import '../widgets/mini_player_widget.dart';
import '../widgets/custom_bottom_nav.dart';

class MainLayoutScreen extends StatefulWidget {
 const MainLayoutScreen({super.key});

 @override
 State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen>
 with WidgetsBindingObserver {
 int _currentIndex = 0;
 final Set<int> _visitedTabs = {0};
 int _refreshCounter = 0;
 int _unreadCount = 0;
 Timer? _notificationTimer;

 // ── Live Class PiP ──────────────────────────────────────────
 final LiveClassPipManager _pip = LiveClassPipManager.instance;
 bool _pipSupported = false;

 late List<Widget> _screens;

  void _updateScreens() {
    _screens = [
      DashboardScreen(key: ValueKey('dashboard_$_refreshCounter')),
      BooksScreen(key: ValueKey('books_$_refreshCounter')),
      YagyaMitraScreen(),
      WalletScreen(),
      ProfileScreen(),
    ];
  }

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

 // Build the tab screen list once; refresh only by _refresh().
    _updateScreens();

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
    final publishedTitle = (event['data'] is Map)
        ? (event['data']['title'] ?? 'New Course').toString()
        : 'New Course';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('🚀 New Course Published: $publishedTitle')),
    );
  } else if (entity == 'wallet' && action == 'wallet_updated') {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('💰 Wallet Balance Updated!')),
    );
  } else if (event['type'] == 'wallet') {
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
      _updateScreens();
    });
  }

  void _selectTab(int index) {
    setState(() {
      _currentIndex = index;
      _visitedTabs.add(index);
    });
  }

  Widget _tabOrPlaceholder(int index) {
    if (!_visitedTabs.contains(index)) {
      return Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
        ),
      );
    }
    return _screens[index];
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
 onPressed: () {
 _fetchUnreadCount();
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(content: Text('आपके पास $_unreadCount अपठित सूचनाएँ हैं')),
 );
 },
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
 children: [
 _tabOrPlaceholder(0),
 _tabOrPlaceholder(1),
 _tabOrPlaceholder(2),
 _tabOrPlaceholder(3),
 _tabOrPlaceholder(4),
 ],
 ),

 // Layer 2: Mini player overlay (when live class is in mini mode)
          if (_pip.isMiniPlayerVisible)
            MiniPlayerWidget(
              onOpenFullScreen: _openFullScreen,
              onClose: () {
                _pip.stopLiveClass();
                try {
                  RealtimeKitUIBuilder.dispose();
                } catch (e, st) {
                  debugPrint('[MainLayout] RealtimeKit dispose error: $e\n$st');
                }
              },
              onToggleMic: () {
                _pip.toggleMic();
                PictureInPictureService.updatePiPActions(
                    micEnabled: _pip.micEnabled);
              },
              title: _pip.title,
              micEnabled: _pip.micEnabled,
            ),
 ],
 ),
      bottomNavigationBar: CustomBottomNav(
        currentIndex: _currentIndex,
        onTap: _selectTab,
      ),
 );
  }
}
