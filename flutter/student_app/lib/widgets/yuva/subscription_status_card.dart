import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'yuva_card.dart';

class SubscriptionStatusCard extends StatelessWidget {
  final Map<String, dynamic> sub;
  final VoidCallback? onTap;

  const SubscriptionStatusCard({
    super.key,
    required this.sub,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final status = (sub['status'] ?? '').toString();
    final planName = (sub['plan_name'] ?? 'Subscription').toString();
    final isActive = status == 'active' || status == 'authenticated';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: YuvaCard(
        onTap: onTap,
        gradient: isActive
            ? const LinearGradient(
                colors: [Color(0xFF064E3B), Color(0xFF022C22)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        backgroundColor: isActive ? null : AppTheme.surfaceOf(context),
        side: isActive
            ? BorderSide(color: AppTheme.success.withAlphaOpacity(0.4), width: 1.5)
            : null,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(AppTheme.space3),
              decoration: BoxDecoration(
                color: isActive
                    ? AppTheme.success.withAlphaOpacity(0.2)
                    : AppTheme.mutedOf(context).withAlphaOpacity(0.1),
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: Icon(
                isActive ? Icons.workspace_premium_rounded : Icons.subscriptions_outlined,
                color: isActive ? AppTheme.success : AppTheme.mutedOf(context),
                size: 26,
              ),
            ),
            const SizedBox(width: AppTheme.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isActive ? 'Premium Active' : 'No Active Plan',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: isActive ? AppTheme.success : AppTheme.textPrimaryOf(context),
                          fontSize: 16,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isActive ? planName : 'Subscribe to get premium access',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: isActive
                              ? AppTheme.surface.withAlphaOpacity(0.85)
                              : AppTheme.textSecondaryOf(context),
                        ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded,
                color: AppTheme.muted, size: 14),
          ],
        ),
      ),
    );
  }
}