import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import 'wallet_screen.dart';
import 'subscription_screen.dart';
import '../utils/responsive.dart';

class ProfileScreen extends StatelessWidget {
 ProfileScreen({super.key});

 @override
 Widget build(BuildContext context) {
 final auth = Provider.of<AuthProvider>(context);
 final user = auth.user;

 final name = (user?['full_name'] ?? user?['name'] ?? 'Student').toString();
 final email = (user?['email'] ?? 'No Email').toString();
 final phone = (user?['phone'] ?? 'No Phone').toString();

 return Container(
 color: AppTheme.backgroundOf(context),
 child: SafeArea(
 child: ResponsiveLayout(
 child: ListView(
 padding: EdgeInsets.all(24.0),
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
 style: TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white),
 ),
 ),
 ),
 SizedBox(height: 24),
 Text(name, textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 26, fontWeight: FontWeight.w900), maxLines: 1, overflow: TextOverflow.ellipsis),
 SizedBox(height: 8),
 Text(email, textAlign: TextAlign.center, style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 16), maxLines: 2, overflow: TextOverflow.ellipsis),
 SizedBox(height: 32),
 _ProfileTile(icon: Icons.phone_android_rounded, title: 'Phone Number', subtitle: phone),
 SizedBox(height: 16),
 _ProfileTile(icon: Icons.history_edu_rounded, title: 'Watch History', subtitle: 'View recently watched lessons', onTap: () {
 ScaffoldMessenger.of(context).showSnackBar(
 SnackBar(content: Text('Watch History जल्द ही उपलब्ध होगा!')),
 );
 }),
 SizedBox(height: 16),
 _ThemeToggleTile(),
 SizedBox(height: 16),
 _ProfileTile(icon: Icons.workspace_premium_rounded, title: 'Subscription', subtitle: 'Manage plans, AI access & more', onTap: () {
 Navigator.push(context, MaterialPageRoute(builder: (_) => SubscriptionScreen()));
 }),
 SizedBox(height: 16),
 _ProfileTile(icon: Icons.account_balance_wallet_rounded, title: 'My Wallet', subtitle: 'Manage wallet & transactions', onTap: () {
 Navigator.push(context, MaterialPageRoute(builder: (_) => WalletScreen()));
 }),
 SizedBox(height: 32),
 SizedBox(
 width: double.infinity,
 height: 52,
 child: OutlinedButton.icon(
 onPressed: () {
 auth.logout().then((_) {
 if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
 }).catchError((e) {
 debugPrint('Logout error: $e');
 });
 },
 icon: Icon(Icons.logout_rounded, color: AppTheme.danger),
 label: Text('Logout', style: TextStyle(color: AppTheme.danger, fontSize: 16, fontWeight: FontWeight.bold)),
 style: OutlinedButton.styleFrom(
 side: BorderSide(color: AppTheme.danger),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
 ),
 ),
 ),
 ],
 ),
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

 _ProfileTile({required this.icon, required this.title, required this.subtitle, this.onTap});

 @override
 Widget build(BuildContext context) {
 return InkWell(
 onTap: onTap,
 borderRadius: BorderRadius.circular(16),
 child: Ink(
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Row(
 children: [
 Icon(icon, color: AppTheme.primaryLight, size: 28),
 SizedBox(width: 16),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text(title, style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 16, fontWeight: FontWeight.w600)),
 SizedBox(height: 4),
 Text(subtitle, style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
 ],
 ),
 ),
 if (onTap != null) Icon(Icons.arrow_forward_ios_rounded, color: AppTheme.mutedOf(context), size: 16),
 ],
 ),
 ),
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

  return InkWell(
  onTap: () {
  // Cycle: system → dark → light → system
  if (theme.isSystem) {
  theme.setThemeMode(ThemeMode.dark);
  } else if (theme.isDark) {
  theme.setThemeMode(ThemeMode.light);
  } else {
  theme.setThemeMode(ThemeMode.system);
  }
  },
 borderRadius: BorderRadius.circular(16),
 child: Ink(
 padding: EdgeInsets.all(16),
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(16),
 border: Border.all(color: AppTheme.borderOf(context)),
 ),
 child: Row(
 children: [
 Icon(icon, color: AppTheme.primaryLight, size: 28),
 SizedBox(width: 16),
 Expanded(
 child: Column(
 crossAxisAlignment: CrossAxisAlignment.start,
 children: [
 Text('Theme', style: TextStyle(color: AppTheme.textPrimaryOf(context), fontSize: 16, fontWeight: FontWeight.w600)),
 SizedBox(height: 4),
 Text(subtitle, style: TextStyle(color: AppTheme.mutedOf(context), fontSize: 13)),
 ],
 ),
 ),
 Switch.adaptive(
 value: theme.isDark,
 activeThumbColor: AppTheme.surfaceOf(context),
 activeTrackColor: AppTheme.primary,
 onChanged: (value) {
 theme.setThemeMode(value ? ThemeMode.dark : ThemeMode.light);
 },
 ),
 ],
 ),
 ),
 );
 }
}