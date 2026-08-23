import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import 'yuva_button.dart';
import 'yuva_card.dart';

class CreditPackCard extends StatelessWidget {
  final Map<String, dynamic> pack;
  final VoidCallback onTap;
  final int index;

  const CreditPackCard({
    super.key,
    required this.pack,
    required this.onTap,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    final name = (pack['name'] ?? 'Pack').toString();
    final amount = num.tryParse(pack['amount_rupees']?.toString() ?? '0') ?? 0;

    return YuvaCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: AppTheme.goldGradient,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: const Icon(Icons.workspace_premium_rounded, color: AppTheme.surface, size: 26),
          ),
          const SizedBox(width: AppTheme.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 16,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space1),
                Text(
                  'Tap to recharge instantly',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textTertiaryOf(context),
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTheme.space2),
          YuvaButton.secondary(
            label: '₹${amount.toStringAsFixed(2)}',
            onPressed: onTap,
            height: 38,
          ),
        ],
      ),
    )
        .animate(delay: (index * 60).ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0, duration: 400.ms);
  }
}