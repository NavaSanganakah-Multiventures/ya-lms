import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'services/admin_routes.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const AdminApp());
}

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NSLMS Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AdminShellScreen(),
    );
  }
}

class AdminShellScreen extends StatefulWidget {
  const AdminShellScreen({super.key});

  @override
  State<AdminShellScreen> createState() => _AdminShellScreenState();
}

class _AdminShellScreenState extends State<AdminShellScreen> {
  var _selectedIndex = 0;

  final _tabs = const [
    _AdminTab(
      label: 'Home',
      icon: Icons.dashboard_rounded,
      screen: AdminDashboardScreen(),
    ),
    _AdminTab(
      label: 'Courses',
      icon: Icons.menu_book_rounded,
      screen: _AdminActionScreen(
        title: 'Courses',
        subtitle: 'Create lessons, recordings, batches and course content.',
        icon: Icons.menu_book_rounded,
        route: _AdminRouteType.courses,
      ),
    ),
    _AdminTab(
      label: 'Live',
      icon: Icons.live_tv_rounded,
      screen: _AdminActionScreen(
        title: 'Live Classes',
        subtitle: 'Schedule, start and manage live classes from the same web admin.',
        icon: Icons.live_tv_rounded,
        route: _AdminRouteType.liveClasses,
      ),
    ),
    _AdminTab(
      label: 'Users',
      icon: Icons.people_alt_rounded,
      screen: _AdminActionScreen(
        title: 'Users',
        subtitle: 'Manage students, teachers, subscribers and access.',
        icon: Icons.people_alt_rounded,
        route: _AdminRouteType.users,
      ),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final current = _tabs[_selectedIndex];
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(current.label == 'Home' ? 'Admin Console' : current.label),
            const Text(
              'NSLMS control center',
              style: TextStyle(color: AppTheme.muted, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Open web admin',
            onPressed: () => _openWebAdmin(context, AdminRoutes.dashboard, 'Web Admin'),
            icon: const Icon(Icons.open_in_browser_rounded),
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: _tabs.map((tab) => tab.screen).toList(growable: false),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: _tabs
            .map(
              (tab) => NavigationDestination(
                icon: Icon(tab.icon),
                label: tab.label,
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}

class _AdminTab {
  final String label;
  final IconData icon;
  final Widget screen;

  const _AdminTab({required this.label, required this.icon, required this.screen});
}

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.25,
          colors: [Color(0x663B1607), AppTheme.background],
        ),
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          const _AdminHeroCard(),
          const SizedBox(height: 18),
          GridView.count(
            crossAxisCount: MediaQuery.sizeOf(context).width > 720 ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.08,
            children: const [
              _MetricCard(
                label: 'Courses',
                value: 'Manage',
                icon: Icons.menu_book_rounded,
                color: AppTheme.primaryLight,
              ),
              _MetricCard(
                label: 'Live',
                value: 'Classes',
                icon: Icons.live_tv_rounded,
                color: AppTheme.danger,
              ),
              _MetricCard(
                label: 'Users',
                value: 'Access',
                icon: Icons.people_alt_rounded,
                color: AppTheme.info,
              ),
              _MetricCard(
                label: 'Plans',
                value: 'Billing',
                icon: Icons.workspace_premium_rounded,
                color: AppTheme.success,
              ),
            ],
          ),
          const SizedBox(height: 18),
          _QuickActions(
            actions: [
              _QuickAction(
                title: 'Open Admin Dashboard',
                subtitle: 'Use website admin with same APIs and database.',
                icon: Icons.admin_panel_settings_rounded,
                onTap: () => _openWebAdmin(context, AdminRoutes.dashboard, 'Admin Dashboard'),
              ),
              _QuickAction(
                title: 'Manage Courses',
                subtitle: 'Create lessons, upload content and process recordings.',
                icon: Icons.library_books_rounded,
                onTap: () => _openWebAdmin(context, AdminRoutes.courses, 'Courses'),
              ),
              _QuickAction(
                title: 'Live Classes',
                subtitle: 'Schedule, start, end and monitor live sessions.',
                icon: Icons.video_call_rounded,
                onTap: () => _openWebAdmin(context, AdminRoutes.liveClasses, 'Live Classes'),
              ),
              _QuickAction(
                title: 'Subscriptions',
                subtitle: 'Plans, live credits and access pools.',
                icon: Icons.payments_rounded,
                onTap: () => _openWebAdmin(context, AdminRoutes.subscriptions, 'Subscriptions'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AdminHeroCard extends StatelessWidget {
  const _AdminHeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1F130B), Color(0xFF111111)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppTheme.border),
        boxShadow: const [BoxShadow(color: Color(0x66000000), blurRadius: 30, offset: Offset(0, 18))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0x22EA580C),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0x44EA580C)),
            ),
            child: const Text(
              'ADMIN CONTROL CENTER',
              style: TextStyle(
                color: AppTheme.primaryLight,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Namaste, Admin',
            style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: -1),
          ),
          const SizedBox(height: 8),
          const Text(
            'Courses, live classes, users aur subscriptions ko ek modern mobile console se manage karein.',
            style: TextStyle(color: AppTheme.muted, height: 1.5),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => _openWebAdmin(context, AdminRoutes.dashboard, 'Admin Dashboard'),
            icon: const Icon(Icons.open_in_browser_rounded),
            label: const Text('OPEN WEB ADMIN'),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color),
          ),
          const Spacer(),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  final List<_QuickAction> actions;

  const _QuickActions({required this.actions});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Quick Actions', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        ...actions.map(
          (action) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _QuickActionTile(action: action),
          ),
        ),
      ],
    );
  }
}

class _QuickAction {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const _QuickAction({required this.title, required this.subtitle, required this.icon, required this.onTap});
}

class _QuickActionTile extends StatelessWidget {
  final _QuickAction action;

  const _QuickActionTile({required this.action});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: action.onTap,
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(color: const Color(0x22EA580C), borderRadius: BorderRadius.circular(16)),
              child: Icon(action.icon, color: AppTheme.primaryLight),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    action.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(action.subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 12, height: 1.35)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.muted, size: 16),
          ],
        ),
      ),
    );
  }
}

enum _AdminRouteType { courses, liveClasses, users }

class _AdminActionScreen extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final _AdminRouteType route;

  const _AdminActionScreen({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
  });

  Uri get _uri => switch (route) {
        _AdminRouteType.courses => AdminRoutes.courses,
        _AdminRouteType.liveClasses => AdminRoutes.liveClasses,
        _AdminRouteType.users => AdminRoutes.users,
      };

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AppTheme.primaryLight, size: 38),
              const SizedBox(height: 16),
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(subtitle, style: const TextStyle(color: AppTheme.muted, height: 1.5)),
              const SizedBox(height: 22),
              ElevatedButton.icon(
                onPressed: () => _openWebAdmin(context, _uri, title),
                icon: const Icon(Icons.open_in_browser_rounded),
                label: const Text('OPEN IN WEB ADMIN'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        const _AdminNotice(),
      ],
    );
  }
}

class _AdminNotice extends StatelessWidget {
  const _AdminNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0x1116A34A),
        border: Border.all(color: const Color(0x3322C55E)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Row(
        children: [
          Icon(Icons.verified_user_outlined, color: AppTheme.success, size: 20),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Admin app website admin ko WebView me open karta hai, isliye same API aur database use hota hai.',
              style: TextStyle(color: AppTheme.muted, fontSize: 12, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

void _openWebAdmin(BuildContext context, Uri uri, String title) {
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => AdminWebViewScreen(uri: uri, title: title),
    ),
  );
}

class AdminWebViewScreen extends StatefulWidget {
  final Uri uri;
  final String title;

  const AdminWebViewScreen({super.key, required this.uri, required this.title});

  @override
  State<AdminWebViewScreen> createState() => _AdminWebViewScreenState();
}

class _AdminWebViewScreenState extends State<AdminWebViewScreen> {
  late final WebViewController _controller;
  var _progress = 0;
  var _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppTheme.background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) => setState(() => _progress = progress),
          onPageStarted: (_) => setState(() => _hasError = false),
          onWebResourceError: (_) => setState(() => _hasError = true),
        ),
      )
      ..loadRequest(widget.uri);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            const Text('Secure website admin', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => _controller.reload(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_progress < 100)
            LinearProgressIndicator(
              value: _progress / 100,
              minHeight: 3,
              color: AppTheme.primary,
              backgroundColor: AppTheme.elevated,
            ),
          if (_hasError)
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.elevated,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Text(
                  'Admin page load nahi ho paya. Internet/session check karke refresh karein.',
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
