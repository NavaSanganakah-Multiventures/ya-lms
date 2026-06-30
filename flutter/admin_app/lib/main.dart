import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/admin_provider.dart';
import 'services/admin_routes.dart';
import 'services/notification_background.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';
import 'screens/admin_dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/manage_courses_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    FirebaseMessaging.onBackgroundMessage(adminFirebaseMessagingBackgroundHandler);
    await AdminNotificationService.instance.init();
  } catch (e) {
    debugPrint('[Admin Firebase init error] $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AdminProvider()),
      ],
      child: const AdminApp(),
    ),
  );
}

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Adityanveshan Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: Consumer<AdminProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && !provider.isAuthenticated) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }

          if (!provider.isAuthenticated) {
            return const LoginScreen();
          }

          return const AdminShellScreen();
        },
      ),
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
      screen: ManageCoursesScreen(),
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
  void initState() {
    super.initState();
    _setupNotificationHandlers();
  }

  void _setupNotificationHandlers() {
    AdminNotificationService.instance.setOnTap((url, data) {
      if (!mounted) return;
      final uri = Uri.tryParse(AdminRoutes.baseUrl + url);
      if (uri == null) {
        debugPrint('[Admin] Invalid notification URL: ${AdminRoutes.baseUrl + url}');
        return;
      }
      _openWebAdmin(context, uri, 'Notification');
    });
  }

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
              'Adityanveshan control center',
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

enum _AdminRouteType { liveClasses, users }

class _AdminActionScreen extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final _AdminRouteType route;

  const _AdminActionScreen({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
  });

  Uri get _uri => switch (route) {
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
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          _controller.goBack();
        } else {
          if (context.mounted) {
            Navigator.of(context).pop();
          }
        }
      },
      child: Scaffold(
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
      ),
    );
  }
}
