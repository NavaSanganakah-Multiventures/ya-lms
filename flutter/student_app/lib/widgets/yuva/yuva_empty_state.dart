import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'yuva_button.dart';

/// Modern empty/error state widget used across the app.
class YuvaEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const YuvaEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  const YuvaEmptyState.error({
    super.key,
    this.title = 'Something went wrong',
    this.subtitle,
    this.actionLabel = 'Try Again',
    this.onAction,
  }) : icon = Icons.error_outline_rounded;

  const YuvaEmptyState.noData({
    super.key,
    this.title = 'No data yet',
    this.subtitle,
    this.actionLabel,
    this.onAction,
  }) : icon = Icons.inbox_outlined;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.space6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(AppTheme.space4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withAlphaOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: AppTheme.primary),
            ),
            const SizedBox(height: AppTheme.space4),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppTheme.textPrimaryOf(context),
                  ),
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: AppTheme.space2),
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textSecondaryOf(context),
                    ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppTheme.space5),
              YuvaButton.outline(
                label: actionLabel!,
                onPressed: onAction,
                height: 48,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
