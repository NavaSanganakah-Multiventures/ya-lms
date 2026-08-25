import 'dart:ui';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/admin_provider.dart';
import 'services/admin_routes.dart';
import 'services/analytics_service.dart';
import 'services/notification_background.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';
import 'screens/admin_dashboard_screen.dart';
import 'screens/login_screen.dart';
import 'screens/manage_courses_screen.dart';
import 'screens/manage_books_screen.dart';
import 'screens/manage_batches_screen.dart';
import 'screens/live_classes_admin_screen.dart';
import 'screens/manage_users_screen.dart';
import 'screens/manage_ai_models_screen.dart';
import 'screens/manage_secrets_screen.dart';
import 'screens/push_notification_screen.dart';
import 'screens/web_view_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await _initializeFirebase();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AdminProvider()),
      ],
      child: const AdminApp(),
    ),
  );
}

Future<void> _initializeFirebase() async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }

    // Crashlytics is only supported on Android/iOS. Keep error presenters
    // universal, but send reports only on native platforms.
    FlutterError.onError = (errorDetails) {
      if (!kIsWeb) {
        FirebaseCrashlytics.instance.recordFlutterError(errorDetails);
      }
      FlutterError.presentError(errorDetails);
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      if (!kIsWeb) {
        FirebaseCrashlytics.instance.recordError(
          error,
          stack,
          fatal: false,
          reason: 'unhandled_async_error',
        );
      }
      return true;
    };

    if (!kIsWeb && kDebugMode) {
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(false);
    }

    AnalyticsService.instance.init(FirebaseAnalytics.instance);

    // Background FCM handler is only applicable on mobile.
    if (!kIsWeb) {
      FirebaseMessaging.onBackgroundMessage(adminFirebaseMessagingBackgroundHandler);
    }
    await AdminNotificationService.instance.init();

  } catch (e, stack) {
    if (kDebugMode) {
      debugPrint('[Admin Firebase init error] $e');
    }
    if (!kIsWeb) {
      await FirebaseCrashlytics.instance.recordError(e, stack, reason: 'firebase_init_failed');
    }
  }
}

class AdminApp extends StatelessWidget {
  const AdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Adityanveshan Admin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      navigatorObservers: [
        if (AnalyticsService.instance.isInitialized)
          FirebaseAnalyticsObserver(analytics: AnalyticsService.instance.analytics),
      ],
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Selector<AdminProvider, ({bool loading, bool authenticated})>(
      selector: (_, provider) => (
        loading: provider.isLoading,
        authenticated: provider.isAuthenticated,
      ),
      builder: (_, state, __) {
        if (state.loading && !state.authenticated) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (!state.authenticated) {
          return const LoginScreen();
        }

        return const AdminShellScreen();
      },
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

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Logout', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to log out from the Admin Console?', style: TextStyle(color: AppTheme.muted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Provider.of<AdminProvider>(context, listen: false).logout();
            },
            child: const Text('Logout', style: TextStyle(color: AppTheme.danger)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final useRail = width > 900;

    Widget body = _LazyIndexedStack(
      index: _selectedIndex,
      children: const [
        AdminDashboardScreen(),
        ManageCoursesScreen(),
        ManageBatchesScreen(),
        ManageBooksScreen(),
        _MoreScreen(),
      ],
    );

    if (useRail) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Adityanveshan Admin'),
          actions: [
            IconButton(
              tooltip: 'Open web admin',
              onPressed: () => _openWebAdmin(context, AdminRoutes.dashboard, 'Web Admin'),
              icon: const Icon(Icons.open_in_browser_rounded),
            ),
          ],
        ),
        drawer: _buildDrawer(context),
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (index) => setState(() => _selectedIndex = index),
              backgroundColor: const Color(0xF20A0A0A),
              selectedIconTheme: const IconThemeData(color: AppTheme.primaryLight),
              unselectedIconTheme: const IconThemeData(color: AppTheme.muted),
              selectedLabelTextStyle: const TextStyle(color: AppTheme.primaryLight, fontSize: 11, fontWeight: FontWeight.w800),
              unselectedLabelTextStyle: const TextStyle(color: AppTheme.muted, fontSize: 11),
              destinations: const [
                NavigationRailDestination(icon: Icon(Icons.dashboard_rounded), label: Text('Home')),
                NavigationRailDestination(icon: Icon(Icons.menu_book_rounded), label: Text('Courses')),
                NavigationRailDestination(icon: Icon(Icons.group_work_rounded), label: Text('Batches')),
                NavigationRailDestination(icon: Icon(Icons.book_rounded), label: Text('Books')),
                NavigationRailDestination(icon: Icon(Icons.more_horiz_rounded), label: Text('More')),
              ],
            ),
            const VerticalDivider(thickness: 1, width: 1, color: AppTheme.border),
            Expanded(child: body),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Adityanveshan Admin'),
        actions: [
          IconButton(
            tooltip: 'Open web admin',
            onPressed: () => _openWebAdmin(context, AdminRoutes.dashboard, 'Web Admin'),
            icon: const Icon(Icons.open_in_browser_rounded),
          ),
        ],
      ),
      drawer: _buildDrawer(context),
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.menu_book_rounded), label: 'Courses'),
          NavigationDestination(icon: Icon(Icons.group_work_rounded), label: 'Batches'),
          NavigationDestination(icon: Icon(Icons.book_rounded), label: 'Books'),
          NavigationDestination(icon: Icon(Icons.more_horiz_rounded), label: 'More'),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: AppTheme.surface,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: AppTheme.elevated),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: const [
                Icon(Icons.admin_panel_settings, color: AppTheme.primaryLight, size: 40),
                SizedBox(height: 8),
                Text('Adityanveshan Admin', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                Text('Control Center', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
              ],
            ),
          ),
          _DrawerItem(
            icon: Icons.live_tv_rounded,
            label: 'Live Classes',
            onTap: () { Navigator.pop(context); _openScreen(const LiveClassesAdminScreen()); },
          ),
          _DrawerItem(
            icon: Icons.people_alt_rounded,
            label: 'Users',
            onTap: () { Navigator.pop(context); _openScreen(const ManageUsersScreen()); },
          ),
          _DrawerItem(
            icon: Icons.smart_toy_rounded,
            label: 'AI Models',
            onTap: () { Navigator.pop(context); _openScreen(const ManageAiModelsScreen()); },
          ),
          _DrawerItem(
            icon: Icons.vpn_key_rounded,
            label: 'KV Secrets',
            onTap: () { Navigator.pop(context); _openScreen(const ManageSecretsScreen()); },
          ),
          _DrawerItem(
            icon: Icons.notifications_active_rounded,
            label: 'Push Notifications',
            onTap: () { Navigator.pop(context); _openScreen(const PushNotificationScreen()); },
          ),
          const _DrawerDivider(),
          _DrawerItem(
            icon: Icons.open_in_browser_rounded,
            label: 'Web Admin',
            onTap: () { Navigator.pop(context); _openWebAdmin(context, AdminRoutes.dashboard, 'Web Admin'); },
          ),
          _DrawerItem(
            icon: Icons.logout_rounded,
            label: 'Logout',
            color: AppTheme.danger,
            onTap: () {
              Navigator.pop(context);
              _confirmLogout(context);
            },
          ),
        ],
      ),
    );
  }

  void _openScreen(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppTheme.primaryLight;
    return ListTile(
      leading: Icon(icon, color: effectiveColor),
      title: Text(label, style: const TextStyle(color: Colors.white)),
      onTap: onTap,
    );
  }
}

class _DrawerDivider extends StatelessWidget {
  const _DrawerDivider();

  @override
  Widget build(BuildContext context) {
    return const Divider(color: AppTheme.border);
  }
}

class _LazyIndexedStack extends StatefulWidget {
  const _LazyIndexedStack({required this.index, required this.children});

  final int index;
  final List<Widget> children;

  @override
  State<_LazyIndexedStack> createState() => _LazyIndexedStackState();
}

class _LazyIndexedStackState extends State<_LazyIndexedStack> {
  final _built = <int>{};

  @override
  Widget build(BuildContext context) {
    _built.add(widget.index);
    return IndexedStack(
      index: widget.index,
      children: List.generate(widget.children.length, (i) {
        return _built.contains(i) ? widget.children[i] : const SizedBox.shrink();
      }),
    );
  }
}

class _MoreScreen extends StatelessWidget {
  const _MoreScreen();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const _MoreCard(
          icon: Icons.live_tv_rounded,
          color: AppTheme.danger,
          title: 'Live Classes',
          subtitle: 'Schedule, start & manage live sessions',
          screen: LiveClassesAdminScreen(),
        ),
        const SizedBox(height: 12),
        const _MoreCard(
          icon: Icons.people_alt_rounded,
          color: AppTheme.info,
          title: 'Users',
          subtitle: 'Manage students, teachers & access',
          screen: ManageUsersScreen(),
        ),
        const SizedBox(height: 12),
        const _MoreCard(
          icon: Icons.smart_toy_rounded,
          color: AppTheme.info,
          title: 'AI Models',
          subtitle: 'Configure AI providers & models',
          screen: ManageAiModelsScreen(),
        ),
        const SizedBox(height: 12),
        const _MoreCard(
          icon: Icons.notifications_active_rounded,
          color: AppTheme.success,
          title: 'Push Notifications',
          subtitle: 'Send notifications to users',
          screen: PushNotificationScreen(),
        ),
        const SizedBox(height: 12),
        const _MoreCard(
          icon: Icons.vpn_key_rounded,
          color: AppTheme.info,
          title: 'KV Secrets',
          subtitle: 'Manage platform secrets & CORS origins',
          screen: ManageSecretsScreen(),
        ),
        const SizedBox(height: 12),
        _MoreCardWeb(
          icon: Icons.open_in_browser_rounded,
          color: AppTheme.primaryLight,
          title: 'Web Admin',
          subtitle: 'Open full admin panel in browser',
          uri: AdminRoutes.dashboard,
        ),
      ],
    );
  }
}

class _MoreCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final Widget screen;

  const _MoreCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.screen,
  });

  @override
  Widget build(BuildContext context) {
    return _MoreCardLayout(
      icon: icon,
      color: color,
      title: title,
      subtitle: subtitle,
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => screen)),
    );
  }
}

class _MoreCardWeb extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final Uri uri;

  const _MoreCardWeb({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.uri,
  });

  @override
  Widget build(BuildContext context) {
    return _MoreCardLayout(
      icon: icon,
      color: color,
      title: title,
      subtitle: subtitle,
      onTap: () => _openWebAdmin(context, uri, title),
    );
  }
}

class _MoreCardLayout extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MoreCardLayout({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: color.withAlpha(36), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
        onTap: onTap,
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
