import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'wallet_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    final name = (user?['full_name'] ?? user?['name'] ?? 'Student').toString();
    final email = (user?['email'] ?? 'No Email').toString();
    final phone = (user?['phone'] ?? 'No Phone').toString();

    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24.0),
          children: [
            Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  gradient: AppTheme.auroraGradient,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.primaryLight, width: 3),
                ),
                alignment: Alignment.center,
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'S',
                  style: const TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(name, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(email, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.muted, fontSize: 16)),
            const SizedBox(height: 32),
            _ProfileTile(icon: Icons.phone_android_rounded, title: 'Phone Number', subtitle: phone),
            const SizedBox(height: 16),
            _ProfileTile(icon: Icons.history_edu_rounded, title: 'Watch History', subtitle: 'View recently watched lessons', onTap: () {}),
            const SizedBox(height: 16),
            _ProfileTile(icon: Icons.account_balance_wallet_rounded, title: 'My Wallet', subtitle: 'Manage credits for classes and AI', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen()));
            }),
            const SizedBox(height: 16),
            _ProfileTile(icon: Icons.settings_rounded, title: 'Settings', subtitle: 'App preferences & notifications', onTap: () {}),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () {
                  auth.logout().then((_) {
                    if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
                  });
                },
                icon: const Icon(Icons.logout_rounded, color: AppTheme.danger),
                label: const Text('Logout', style: TextStyle(color: AppTheme.danger, fontSize: 16, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.danger),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _ProfileTile({required this.icon, required this.title, required this.subtitle, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.primaryLight, size: 28),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                ],
              ),
            ),
            if (onTap != null) const Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.muted, size: 16),
          ],
        ),
      ),
    );
  }
}
