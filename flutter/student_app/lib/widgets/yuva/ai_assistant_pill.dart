import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Floating AI assistant pill that can be placed above bottom navs or inside screens.
class AiAssistantPill extends StatelessWidget {
  final VoidCallback? onTap;
  final String label;
  final bool isExpanded;

  const AiAssistantPill({
    super.key,
    this.onTap,
    this.label = 'Ask Yagya Mitra',
    this.isExpanded = true,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space2 + 4),
          decoration: BoxDecoration(
            gradient: AppTheme.premiumGradient,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            boxShadow: AppTheme.mediumShadow,
          ),
          child: Row(
            mainAxisSize: isExpanded ? MainAxisSize.min : MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(AppTheme.space1 + 2),
                decoration: const BoxDecoration(
                  color: AppTheme.surface,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: AppTheme.accent, size: 18),
              ),
              if (isExpanded) ...[
                const SizedBox(width: AppTheme.space2 + 4),
                Text(
                  label,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppTheme.surface,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
