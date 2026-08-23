import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import 'yuva_button.dart';
import 'yuva_card.dart';

class SubscriptionPlanCard extends StatelessWidget {
  final Map<String, dynamic> plan;
  final bool isCurrentPlan;
  final bool subscribing;
  final VoidCallback? onSubscribe;
  final int index;

  const SubscriptionPlanCard({
    super.key,
    required this.plan,
    this.isCurrentPlan = false,
    this.subscribing = false,
    this.onSubscribe,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    final name = (plan['name'] ?? 'Plan').toString();
    final amountInr = plan['amount_rupees'] ?? 0;
    final interval = (plan['interval'] ?? 'monthly').toString();
    final courseAccess = (plan['course_access_type'] ?? 'none').toString();
    final batchAccess = (plan['batch_access_type'] ?? 'none').toString();
    final walletTopup = num.tryParse(plan['wallet_amount_rupees']?.toString() ?? '') ?? 0;
    final liveSessionAccess = plan['live_session_access'] == 1 || plan['live_session_access'] == true;
    final isLifetime = plan['is_lifetime'] == 1 || plan['is_lifetime'] == true;

    final features = <String>[];
    if (courseAccess == 'all') features.add('All courses access');
    if (courseAccess == 'user_choice') features.add('Choose ${plan['max_course_selection'] ?? '?'} courses');
    if (batchAccess == 'user_choice') features.add('Choose ${plan['max_batch_selection'] ?? '?'} batches');
    if (walletTopup > 0) features.add('₹${walletTopup.toStringAsFixed(2)} wallet topup');
    if (liveSessionAccess) features.add('Live session access');
    final liveClassAmount = num.tryParse(plan['live_class_amount_rupees']?.toString() ?? '') ?? 0;
    if (liveClassAmount > 0) features.add('₹${liveClassAmount.toStringAsFixed(2)} Live Class Wallet');

    return YuvaCard(
      gradient: isCurrentPlan ? AppTheme.auroraGradient : null,
      backgroundColor: isCurrentPlan ? null : AppTheme.surfaceOf(context),
      side: isCurrentPlan ? null : BorderSide(color: AppTheme.borderOf(context)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  name,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: isCurrentPlan ? AppTheme.surface : AppTheme.textPrimaryOf(context),
                        fontSize: 18,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (isCurrentPlan)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surface.withAlphaOpacity(0.25),
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                  child: Text(
                    'CURRENT',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: AppTheme.surface,
                          fontSize: 10,
                        ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppTheme.space2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${(amountInr is num ? amountInr : num.tryParse(amountInr.toString()) ?? 0).toStringAsFixed(2)}',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: isCurrentPlan ? AppTheme.surface : AppTheme.success,
                      fontSize: 26,
                    ),
              ),
              const SizedBox(width: 4),
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '/ $interval${isLifetime ? ' (Lifetime)' : ''}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isCurrentPlan ? AppTheme.surface.withAlphaOpacity(0.8) : AppTheme.mutedOf(context),
                      ),
                ),
              ),
            ],
          ),
          if (features.isNotEmpty) ...[
            const SizedBox(height: AppTheme.space4),
            ...features.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: AppTheme.space2),
              child: Row(
                children: [
                  Icon(Icons.check_circle_outline, color: isCurrentPlan ? AppTheme.surface : AppTheme.primary, size: 18),
                  const SizedBox(width: AppTheme.space2),
                  Expanded(
                    child: Text(
                      f,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: isCurrentPlan ? AppTheme.surface.withAlphaOpacity(0.9) : AppTheme.textSecondaryOf(context),
                            fontSize: 13,
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            )),
          ],
          const SizedBox(height: AppTheme.space4),
          YuvaButton(
            label: isCurrentPlan
                ? 'Current Plan'
                : (subscribing ? 'Subscribing...' : 'Subscribe Now'),
            onPressed: isCurrentPlan || subscribing ? null : onSubscribe,
            variant: isCurrentPlan ? YuvaButtonVariant.outline : YuvaButtonVariant.primary,
            isLoading: subscribing,
          ),
        ],
      ),
    )
        .animate(delay: (index * 70).ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0, duration: 400.ms);
  }
}