import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class YagyaMitraScreen extends StatelessWidget {
  const YagyaMitraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.smart_toy_rounded, color: AppTheme.primaryLight, size: 64),
          SizedBox(height: 16),
          Text(
            'Yagya Mitra AI',
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 24, fontWeight: FontWeight.w900),
          ),
          SizedBox(height: 8),
          Text(
            'Coming Soon',
            style: TextStyle(color: AppTheme.muted, fontSize: 16),
          ),
        ],
      ),
    );
  }
}
