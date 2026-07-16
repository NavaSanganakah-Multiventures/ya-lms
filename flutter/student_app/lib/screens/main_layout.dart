import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'dashboard_screen.dart';
import 'books_screen.dart';
import 'wallet_screen.dart';
import 'profile_screen.dart';
import 'yagya_mitra_screen.dart';

class MainLayoutScreen extends StatefulWidget {
  const MainLayoutScreen({super.key});

  @override
  State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen> {
  int _currentIndex = 0;
  int _refreshCounter = 0;
  int _unreadCount = 0;
  Timer? _notificationTimer;

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
    _fetchUnreadCount();
    _notificationTimer = Timer.periodic(const Duration(seconds: 30), (_) => _fetchUnreadCount());
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
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
    } catch (_) {}
  }

  void _refresh() {
    setState(() {
      _refreshCounter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Student Dashboard', 'Books Library', 'Yagya Mitra', 'My Wallet', 'My Profile'];

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
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      child: Text(
                        _unreadCount.toString(),
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
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
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
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
            height: 72,
            padding: EdgeInsets.zero,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(index: 0, icon: Icons.dashboard_rounded, label: 'Home'),
                _navItem(index: 1, icon: Icons.library_books_rounded, label: 'Library'),
                _CenterNavItem(onTap: () => setState(() => _currentIndex = 2)),
                _navItem(index: 3, icon: Icons.account_balance_wallet_rounded, label: 'Wallet'),
                _navItem(index: 4, icon: Icons.account_circle_rounded, label: 'Profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem({required int index, required IconData icon, required String label}) {
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
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CenterNavItem extends StatefulWidget {
  final VoidCallback onTap;
  const _CenterNavItem({required this.onTap});

  @override
  State<_CenterNavItem> createState() => _CenterNavItemState();
}

class _CenterNavItemState extends State<_CenterNavItem> with SingleTickerProviderStateMixin {
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
                      color: AppTheme.primaryLight.withAlpha((80 * glowOpacity).round()),
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
