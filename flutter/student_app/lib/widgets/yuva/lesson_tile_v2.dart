import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import 'yuva_card.dart';

class LessonTileV2 extends StatelessWidget {
  final Map<String, dynamic> lesson;
  final VoidCallback onTap;
  final int index;

  const LessonTileV2({
    super.key,
    required this.lesson,
    required this.onTap,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    final type = (lesson['type'] ?? '').toString();
    final isLocked = lesson['is_locked'] == true;
    final isCompleted = lesson['is_completed'] == true || lesson['progress_percent'] == 100;
    final icon = _iconForType(type);
    final iconColor = isLocked ? AppTheme.mutedOf(context) : AppTheme.primary;

    return YuvaCard(
      onTap: isLocked ? null : onTap,
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space3 + 4),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isLocked ? AppTheme.mutedSoftOf(context) : AppTheme.primary.withAlphaOpacity(0.1),
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: AppTheme.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lesson['title'] ?? 'Untitled Lesson',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: isLocked ? AppTheme.textSecondaryOf(context) : AppTheme.textPrimaryOf(context),
                        fontSize: 15,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space1),
                Row(
                  children: [
                    _TypeBadge(type: type, isLocked: isLocked),
                    if (isCompleted) ...[
                      const SizedBox(width: AppTheme.space2),
                      const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 14),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTheme.space2),
          Icon(
            isLocked ? Icons.lock_outline_rounded : Icons.chevron_right_rounded,
            color: isLocked ? AppTheme.danger : AppTheme.mutedOf(context),
            size: 22,
          ),
        ],
      ),
    )
        .animate(delay: (index * 50).ms)
        .fadeIn(duration: 350.ms)
        .slideY(begin: 0.08, end: 0, duration: 350.ms);
  }

  IconData _iconForType(String type) {
    return switch (type) {
      'video' => Icons.play_circle_outline_rounded,
      'recording' => Icons.video_library_outlined,
      'live' => Icons.live_tv_rounded,
      'pdf' => Icons.picture_as_pdf_outlined,
      'audio' => Icons.audiotrack_outlined,
      'quiz' => Icons.quiz_outlined,
      _ => Icons.insert_drive_file_outlined,
    };
  }
}

class _TypeBadge extends StatelessWidget {
  final String type;
  final bool isLocked;

  const _TypeBadge({required this.type, required this.isLocked});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isLocked ? AppTheme.mutedSoftOf(context) : AppTheme.primary.withAlphaOpacity(0.1),
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      ),
      child: Text(
        type.toUpperCase().isEmpty ? 'LESSON' : type.toUpperCase(),
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: isLocked ? AppTheme.mutedOf(context) : AppTheme.primary,
              fontSize: 10,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}