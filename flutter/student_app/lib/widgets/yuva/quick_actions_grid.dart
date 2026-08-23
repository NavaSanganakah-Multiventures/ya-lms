import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class QuickActionsGrid extends StatelessWidget {
  final VoidCallback? onAskAi;
  final VoidCallback? onAddMoney;
  final VoidCallback? onLibrary;
  final VoidCallback? onQuiz;

  const QuickActionsGrid({
    super.key,
    this.onAskAi,
    this.onAddMoney,
    this.onLibrary,
    this.onQuiz,
  });

  @override
  Widget build(BuildContext context) {
    final actions = [
      _ActionItem(
        icon: Icons.psychology_rounded,
        label: 'AI Doubt',
        gradient: AppTheme.premiumGradient,
        onTap: onAskAi,
      ),
      _ActionItem(
        icon: Icons.account_balance_wallet_rounded,
        label: 'Add Money',
        gradient: AppTheme.goldGradient,
        onTap: onAddMoney,
      ),
      _ActionItem(
        icon: Icons.library_books_rounded,
        label: 'Library',
        gradient: AppTheme.auroraGradient,
        onTap: onLibrary,
      ),
      _ActionItem(
        icon: Icons.quiz_rounded,
        label: 'Quizzes',
        gradient: AppTheme.sacredGradient,
        onTap: onQuiz,
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: Row(
        children: actions
            .map((item) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.space1 + 2),
                    child: _ActionButton(item: item),
                  ),
                ))
            .toList(),
      ),
    );
  }
}

class _ActionItem {
  final IconData icon;
  final String label;
  final Gradient gradient;
  final VoidCallback? onTap;

  _ActionItem({
    required this.icon,
    required this.label,
    required this.gradient,
    this.onTap,
  });
}

class _ActionButton extends StatelessWidget {
  final _ActionItem item;

  const _ActionButton({required this.item});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTheme.surfaceOf(context),
      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: AppTheme.space3 + 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            border: Border.all(color: AppTheme.borderOf(context)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(AppTheme.space2 + 4),
                decoration: BoxDecoration(
                  gradient: item.gradient,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                ),
                child: Icon(item.icon, color: AppTheme.surface, size: 22),
              ),
              const SizedBox(height: AppTheme.space2 + 4),
              Text(
                item.label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.textPrimaryOf(context),
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}