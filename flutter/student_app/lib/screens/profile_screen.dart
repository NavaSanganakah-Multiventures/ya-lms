import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import '../widgets/course_image.dart';
import '../widgets/yuva/index.dart';
import 'subscription_screen.dart';
import 'wallet_screen.dart';

class ProfileScreen extends StatelessWidget {
  ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    final name = (user?['full_name'] ?? user?['name'] ?? 'Student').toString();
    final email = (user?['email'] ?? 'No Email').toString();
    final phone = (user?['phone'] ?? 'No Phone').toString();
    final avatarUrl = _pickAvatarUrl(user);

    return Container(
      color: AppTheme.backgroundOf(context),
      child: SafeArea(
        child: ResponsiveLayout(
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _ProfileHeader(name: name, email: email, avatarUrl: avatarUrl)),
              const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
              SliverToBoxAdapter(
                child: _ProfileGroup(
                  title: 'Account',
                  children: [
                    _ProfileTile(
                      icon: Icons.phone_android_rounded,
                      title: 'Phone Number',
                      subtitle: phone,
                    ),
                    _ProfileTile(
                      icon: Icons.history_edu_rounded,
                      title: 'Watch History',
                      subtitle: 'View recently watched lessons',
                      onTap: () => _showSnack(context, 'Watch History जल्द ही उपलब्ध होगा!'),
                    ),
                  ],
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
              SliverToBoxAdapter(
                child: _ProfileGroup(
                  title: 'Preferences',
                  children: [
                    _ThemeToggleTile(),
                  ],
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space5)),
              SliverToBoxAdapter(
                child: _ProfileGroup(
                  title: 'Payments',
                  children: [
                    _ProfileTile(
                      icon: Icons.workspace_premium_rounded,
                      title: 'Subscription',
                      subtitle: 'Manage plans, AI access & more',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SubscriptionScreen())),
                    ),
                    _ProfileTile(
                      icon: Icons.account_balance_wallet_rounded,
                      title: 'My Wallet',
                      subtitle: 'Manage wallet & transactions',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => WalletScreen())),
                    ),
                  ],
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space6)),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
                sliver: SliverToBoxAdapter(
                  child: YuvaButton.outline(
                    label: 'Logout',
                    icon: Icons.logout_rounded,
                    onPressed: () {
                      auth.logout().then((_) {
                        if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
                      }).catchError((e) => debugPrint('Logout error: $e'));
                    },
                    height: 52,
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppTheme.space6)),
            ],
          ),
        ),
      ),
    );
  }

  String? _pickAvatarUrl(Map<String, dynamic>? user) {
    if (user == null) return null;
    for (final key in ['avatar_url', 'profile_image', 'image_url', 'photo_url']) {
      final raw = user[key];
      if (raw != null) {
        final url = raw.toString().trim();
        if (url.isNotEmpty && url != 'null') return url;
      }
    }
    return null;
  }

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String email;
  final String? avatarUrl;

  const _ProfileHeader({required this.name, required this.email, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      decoration: BoxDecoration(
        gradient: AppTheme.auroraGradient,
        borderRadius: BorderRadius.circular(AppTheme.radius2Xl),
        boxShadow: AppTheme.mediumShadow,
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space5),
        child: Column(
          children: [
            _Avatar(name: name, avatarUrl: avatarUrl),
            const SizedBox(height: AppTheme.space4),
            Text(
              name,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: AppTheme.surface,
                    fontSize: 24,
                  ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppTheme.space1),
            Text(
              email,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.surface.withAlphaOpacity(0.85),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String name;
  final String? avatarUrl;

  const _Avatar({required this.name, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    Widget child;
    if (avatarUrl != null) {
      final resolved = CourseImage.resolveUrl(avatarUrl);
      child = resolved != null
          ? Image.network(resolved, fit: BoxFit.cover)
          : _FallbackAvatar(name: name);
    } else {
      child = _FallbackAvatar(name: name);
    }

    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: AppTheme.surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppTheme.surface, width: 4),
        boxShadow: AppTheme.softShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }
}

class _FallbackAvatar extends StatelessWidget {
  final String name;

  const _FallbackAvatar({required this.name});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : 'S',
        style: Theme.of(context).textTheme.displayLarge?.copyWith(
              color: AppTheme.primary,
              fontSize: 40,
            ),
      ),
    );
  }
}

class _ProfileGroup extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _ProfileGroup({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: AppTheme.space2, bottom: AppTheme.space2),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: AppTheme.mutedOf(context),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          YuvaCard(
            padding: const EdgeInsets.all(AppTheme.space3),
            child: Column(
              children: children,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: AppTheme.primary.withAlphaOpacity(0.1),
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        child: Icon(icon, color: AppTheme.primary, size: 22),
      ),
      title: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppTheme.textPrimaryOf(context),
              fontSize: 15,
            ),
      ),
      subtitle: Text(
        subtitle,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.mutedOf(context),
            ),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: onTap != null
          ? const Icon(Icons.chevron_right_rounded, color: AppTheme.muted)
          : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
    );
  }
}

class _ThemeToggleTile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();
    final icon = theme.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded;
    final subtitle = theme.isSystem
        ? 'Follow system setting'
        : (theme.isDark ? 'Dark mode active' : 'Light mode active');

    return ListTile(
      onTap: () {
        if (theme.isSystem) {
          theme.setThemeMode(ThemeMode.dark);
        } else if (theme.isDark) {
          theme.setThemeMode(ThemeMode.light);
        } else {
          theme.setThemeMode(ThemeMode.system);
        }
      },
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: AppTheme.primary.withAlphaOpacity(0.1),
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
        child: Icon(icon, color: AppTheme.primary, size: 22),
      ),
      title: Text(
        'Theme',
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: AppTheme.textPrimaryOf(context),
              fontSize: 15,
            ),
      ),
      subtitle: Text(
        subtitle,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.mutedOf(context)),
      ),
      trailing: Switch.adaptive(
        value: theme.isDark,
        activeThumbColor: AppTheme.surfaceOf(context),
        activeTrackColor: AppTheme.primary,
        onChanged: (value) => theme.setThemeMode(value ? ThemeMode.dark : ThemeMode.light),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
    );
  }
}