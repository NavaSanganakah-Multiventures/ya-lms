import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      backgroundColor: AppTheme.background,
      body: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.workspace_premium, color: AppTheme.primaryLight, size: 64),
            SizedBox(height: 16),
            Text(
              'Subscription Plans',
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 24, fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 8),
            Text(
              'Coming Soon',
              style: TextStyle(color: AppTheme.muted, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
