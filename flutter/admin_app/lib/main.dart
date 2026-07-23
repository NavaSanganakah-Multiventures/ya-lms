import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
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
import 'screens/manage_books_screen.dart';
import 'screens/manage_batches_screen.dart';
import 'screens/live_classes_admin_screen.dart';
import 'screens/manage_users_screen.dart';
import 'screens/manage_ai_models_screen.dart';
import 'screens/push_notification_screen.dart';
import 'screens/web_view_screen.dart';

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

    Widget body = IndexedStack(
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
          _drawerItem(Icons.live_tv_rounded, 'Live Classes', () { Navigator.pop(context); _openScreen(const LiveClassesAdminScreen()); }),
          _drawerItem(Icons.people_alt_rounded, 'Users', () { Navigator.pop(context); _openScreen(const ManageUsersScreen()); }),
          _drawerItem(Icons.smart_toy_rounded, 'AI Models', () { Navigator.pop(context); _openScreen(const ManageAiModelsScreen()); }),
          _drawerItem(Icons.notifications_active_rounded, 'Push Notifications', () { Navigator.pop(context); _openScreen(const PushNotificationScreen()); }),
          const Divider(color: AppTheme.border),
          _drawerItem(Icons.open_in_browser_rounded, 'Web Admin', () { Navigator.pop(context); _openWebAdmin(context, AdminRoutes.dashboard, 'Web Admin'); }),
          _drawerItem(Icons.logout_rounded, 'Logout', () {
            Navigator.pop(context);
            _confirmLogout(context);
          }, color: AppTheme.danger),
        ],
      ),
    );
  }

  Widget _drawerItem(IconData icon, String label, VoidCallback onTap, {Color? color}) {
    return ListTile(
      leading: Icon(icon, color: color ?? AppTheme.primaryLight),
      title: Text(label, style: TextStyle(color: color ?? Colors.white)),
      onTap: onTap,
    );
  }

  void _openScreen(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }
}

class _MoreScreen extends StatelessWidget {
  const _MoreScreen();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _moreCard(
          context,
          icon: Icons.live_tv_rounded,
          color: AppTheme.danger,
          title: 'Live Classes',
          subtitle: 'Schedule, start & manage live sessions',
          screen: const LiveClassesAdminScreen(),
        ),
        const SizedBox(height: 12),
        _moreCard(
          context,
          icon: Icons.people_alt_rounded,
          color: AppTheme.info,
          title: 'Users',
          subtitle: 'Manage students, teachers & access',
          screen: const ManageUsersScreen(),
        ),
        const SizedBox(height: 12),
        _moreCard(
          context,
          icon: Icons.smart_toy_rounded,
          color: AppTheme.info,
          title: 'AI Models',
          subtitle: 'Configure AI providers & models',
          screen: const ManageAiModelsScreen(),
        ),
        const SizedBox(height: 12),
        _moreCard(
          context,
          icon: Icons.notifications_active_rounded,
          color: AppTheme.success,
          title: 'Push Notifications',
          subtitle: 'Send notifications to users',
          screen: const PushNotificationScreen(),
        ),
        const SizedBox(height: 12),
        _moreCardWeb(
          context,
          icon: Icons.open_in_browser_rounded,
          color: AppTheme.primaryLight,
          title: 'Web Admin',
          subtitle: 'Open full admin panel in browser',
          uri: AdminRoutes.dashboard,
        ),
      ],
    );
  }

  Widget _moreCard(BuildContext context, {required IconData icon, required Color color, required String title, required String subtitle, required Widget screen}) {
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
          decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => screen)),
      ),
    );
  }

  Widget _moreCardWeb(BuildContext context, {required IconData icon, required Color color, required String title, required String subtitle, required Uri uri}) {
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
          decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
        onTap: () => _openWebAdmin(context, uri, title),
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
