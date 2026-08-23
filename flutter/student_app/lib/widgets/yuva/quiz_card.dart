import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import 'yuva_card.dart';

class QuizCard extends StatelessWidget {
  final Map<String, dynamic> quiz;
  final VoidCallback onTap;
  final int index;

  const QuizCard({
    super.key,
    required this.quiz,
    required this.onTap,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    final title = (quiz['title'] ?? 'Untitled Quiz').toString();
    final duration = quiz['duration_minutes'] ?? 0;
    final marks = quiz['total_marks'] ?? 0;
    final questionsCount = quiz['questions_count'] ?? quiz['total_questions'] ?? 0;

    return YuvaCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: AppTheme.premiumGradient,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: const Icon(Icons.quiz_rounded, color: AppTheme.surface, size: 28),
          ),
          const SizedBox(width: AppTheme.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 16,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space2),
                Row(
                  children: [
                    _MetaPill(icon: Icons.timer_outlined, label: '$duration min'),
                    const SizedBox(width: AppTheme.space2),
                    _MetaPill(icon: Icons.star_outline_rounded, label: '$marks marks'),
                    if (questionsCount > 0) ...[
                      const SizedBox(width: AppTheme.space2),
                      _MetaPill(icon: Icons.help_outline_rounded, label: '$questionsCount Qs'),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTheme.space2),
          const Icon(Icons.chevron_right_rounded, color: AppTheme.muted),
        ],
      ),
    )
        .animate(delay: (index * 60).ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0, duration: 400.ms);
  }
}

class _MetaPill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetaPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.elevatedOf(context),
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        border: Border.all(color: AppTheme.borderOf(context)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppTheme.mutedOf(context)),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondaryOf(context),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}