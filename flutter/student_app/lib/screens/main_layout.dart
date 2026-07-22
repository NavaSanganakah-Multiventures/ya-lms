import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:realtimekit_ui/realtimekit_ui.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../services/live_class_pip_manager.dart';
import '../services/picture_in_picture_service.dart';
import 'dashboard_screen.dart';
import 'books_screen.dart';
import 'wallet_screen.dart';
import 'profile_screen.dart';
import 'yagya_mitra_screen.dart';
import 'live_class_realtimekit_screen.dart';
import '../utils/responsive.dart';

class MainLayoutScreen extends StatefulWidget {
  const MainLayoutScreen({super.key});

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
        const YagyaMitraScreen(),
        const WalletScreen(),
        const ProfileScreen(),
      ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _pip.addListener(_onPipChange);
    _fetchUnreadCount();
    _notificationTimer =
        Timer.periodic(const Duration(seconds: 120), (_) => _fetchUnreadCount());
    _checkPipSupport();
  }

  @override
  void dispose() {
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
        final data = jsonDecode(res.body);
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
          requiredCredits: _pip.maxMinutes > 0 ? 0 : 0,
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
        backgroundColor: AppTheme.background.withValues(alpha: 0.9),
        elevation: 0,
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () {},
                color: AppTheme.textPrimary,
              ),
              if (_unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.danger,
                      shape: BoxShape.circle,
                    ),
                    constraints:
                        const BoxConstraints(minWidth: 18, minHeight: 18),
                    child: Text(
                      _unreadCount.toString(),
                      style: const TextStyle(
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
              icon: const Icon(Icons.refresh_rounded),
              onPressed: _refresh,
            ),
            const SizedBox(width: 8),
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
            color: const Color(0xFF1A1A2E),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.primaryLight.withAlpha(80)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(80),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Video placeholder / live indicator
              Container(
                width: isMobile(context) ? 90 : (isTablet(context) ? 100 : 120),
                decoration: const BoxDecoration(
                  color: Colors.black45,
                  borderRadius: BorderRadius.horizontal(
                      left: Radius.circular(16)),
                ),
                child: const Center(
                  child: Icon(Icons.videocam_rounded,
                      color: Colors.white54, size: 32),
                ),
              ),
              const SizedBox(width: 12),
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
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.greenAccent,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
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
                icon: const Icon(Icons.close, color: Colors.white54),
                onPressed: () {
                  _pip.stopLiveClass();
                  RealtimeKitUIBuilder.dispose();
                },
                tooltip: 'Leave Class',
              ),
              const SizedBox(width: 4),
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
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: BottomAppBar(
          color: AppTheme.surface,
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
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isSelected ? AppTheme.primary : AppTheme.muted,
                size: 24,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? AppTheme.primary : AppTheme.muted,
                  fontSize: 10,
                  fontWeight:
                      isSelected ? FontWeight.w700 : FontWeight.w500,
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
  const _CenterNavItem({required this.onTap});

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
      duration: const Duration(milliseconds: 2000),
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
            padding: const EdgeInsets.only(top: 0),
            child: InkWell(
              onTap: widget.onTap,
              borderRadius: BorderRadius.circular(28),
              child: Container(
                width: 60,
                height: 60,
                margin: const EdgeInsets.only(bottom: 4),
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
                child: const Icon(
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
