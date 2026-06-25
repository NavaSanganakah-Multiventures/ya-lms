import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/admin_provider.dart';
import '../theme/app_theme.dart';
import '../services/admin_routes.dart';
import '../main.dart' show AdminWebViewScreen; // Temporary for fallback actions if needed
import 'manage_courses_screen.dart';
import 'manage_users_screen.dart';
import 'live_classes_admin_screen.dart';
import 'push_notification_screen.dart';
import 'manage_books_screen.dart';
import 'manage_batches_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AdminProvider>(context, listen: false).fetchDashboardStats();
    });
  }

  void _openWebAdmin(BuildContext context, Uri uri, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AdminWebViewScreen(uri: uri, title: title),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AdminProvider>(context);
    final stats = provider.dashboardStats ?? {};
    final isLoading = provider.dashboardStats == null;

    final coursesCount = stats['coursesCount']?.toString() ?? '0';
    final liveClassesCount = stats['liveClassesCount']?.toString() ?? '0';
    final usersCount = stats['usersCount']?.toString() ?? '0';
    final revenue = stats['revenue']?.toString() ?? '0';

    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.topRight,
          radius: 1.25,
          colors: [Color(0x663B1607), AppTheme.background],
        ),
      ),
      child: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.elevated,
        onRefresh: () => provider.fetchDashboardStats(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            const _AdminHeroCard(),
            const SizedBox(height: 18),
            if (isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: CircularProgressIndicator(color: AppTheme.primaryLight),
                ),
              )
            else
              GridView.count(
                crossAxisCount: MediaQuery.sizeOf(context).width > 720 ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.08,
                children: [
                  _MetricCard(
                    label: 'Total Courses',
                    value: coursesCount,
                    icon: Icons.menu_book_rounded,
                    color: AppTheme.primaryLight,
                  ),
                  _MetricCard(
                    label: 'Live Classes',
                    value: liveClassesCount,
                    icon: Icons.live_tv_rounded,
                    color: AppTheme.danger,
                  ),
                  _MetricCard(
                    label: 'Total Users',
                    value: usersCount,
                    icon: Icons.people_alt_rounded,
                    color: AppTheme.info,
                  ),
                  _MetricCard(
                    label: 'Revenue',
                    value: '₹$revenue',
                    icon: Icons.workspace_premium_rounded,
                    color: AppTheme.success,
                  ),
                ],
              ),
            const SizedBox(height: 18),
            _QuickActions(
              actions: [
                _QuickAction(
                  title: 'Open Web Admin (Legacy)',
                  subtitle: 'Use website admin with same APIs and database.',
                  icon: Icons.admin_panel_settings_rounded,
                  onTap: () => _openWebAdmin(context, AdminRoutes.dashboard, 'Admin Dashboard'),
                ),
                _QuickAction(
                  title: 'Manage Courses',
                  subtitle: 'Create lessons, upload content and process recordings.',
                  icon: Icons.library_books_rounded,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ManageCoursesScreen()));
                  },
                ),
                _QuickAction(
                  title: 'Live Classes',
                  subtitle: 'Schedule, start, end and monitor live sessions.',
                  icon: Icons.video_call_rounded,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LiveClassesAdminScreen()));
                  },
                ),
                _QuickAction(
                  title: 'Users & Subscriptions',
                  subtitle: 'Plans, live credits and access pools.',
                  icon: Icons.payments_rounded,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ManageUsersScreen()));
                  },
                ),
                _QuickAction(
                  title: 'Push Notifications',
                  subtitle: 'Send FCM notifications to all devices.',
                  icon: Icons.notifications_active_rounded,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PushNotificationScreen()));
                  },
                ),
                _QuickAction(
                  title: 'Manage Books',
                  subtitle: 'View and manage digital books.',
                  icon: Icons.book_rounded,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ManageBooksScreen()));
                  },
                ),
                _QuickAction(
                  title: 'Manage Batches',
                  subtitle: 'View and manage student batches.',
                  icon: Icons.group_work_rounded,
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ManageBatchesScreen()));
                  },
                ),
                _QuickAction(
                  title: 'Database Management',
                  subtitle: 'Backup, restore & migrate database.',
                  icon: Icons.storage_rounded,
                  onTap: () => _openWebAdmin(context, Uri.parse('${AdminRoutes.baseUrl}/admin/database'), 'Database Management'),
                ),
              ],
            ),
          ],
        ),
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
            'Manage everything from your unified native mobile console.',
            style: TextStyle(color: AppTheme.muted, height: 1.5),
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
            decoration: BoxDecoration(color: color.withAlpha(36), borderRadius: BorderRadius.circular(14)),
            child: Icon(icon, color: color),
          ),
          const Spacer(),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
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
