import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';
import '../../theme/app_theme.dart';
import '../course_image.dart';
import 'yuva_button.dart';
import 'yuva_card.dart';

class ContinueLearningCard extends StatelessWidget {
  final Map<String, dynamic> course;
  final VoidCallback? onTap;

  const ContinueLearningCard({
    super.key,
    required this.course,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final title = (course['title'] ?? 'Course').toString();
    final lessonTitle = (course['last_lesson_title'] ??
            course['next_lesson_title'] ??
            'Continue where you left off')
        .toString();
    final progressPercent = _parseProgress(course['progress_percent'] ?? course['progress']);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: YuvaCard(
        onTap: onTap,
        gradient: AppTheme.auroraGradient,
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppTheme.space4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    child: CourseImage(
                      course: course,
                      width: 72,
                      height: 72,
                      borderRadius: 0,
                    ),
                  ),
                  const SizedBox(width: AppTheme.space3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.surface.withAlphaOpacity(0.2),
                            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                          ),
                          child: const Text(
                            'Continue Learning',
                            style: TextStyle(
                              color: AppTheme.surface,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppTheme.space2 + 4),
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: AppTheme.surface,
                                fontSize: 18,
                              ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: AppTheme.space1),
                        Text(
                          lessonTitle,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: AppTheme.surface.withAlphaOpacity(0.85),
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(AppTheme.space4, 0, AppTheme.space4, AppTheme.space4),
              child: Row(
                children: [
                  CircularPercentIndicator(
                    radius: 22,
                    lineWidth: 4,
                    percent: progressPercent,
                    center: Text(
                      '${(progressPercent * 100).round()}%',
                      style: const TextStyle(
                        color: AppTheme.surface,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    progressColor: AppTheme.surface,
                    backgroundColor: AppTheme.surface.withAlphaOpacity(0.25),
                    circularStrokeCap: CircularStrokeCap.round,
                  ),
                  const SizedBox(width: AppTheme.space3),
                  Expanded(
                    child: YuvaButton.outline(
                      label: 'Resume',
                      onPressed: onTap,
                      height: 44,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  double _parseProgress(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.clamp(0.0, 1.0).toDouble();
    if (value is String) {
      final parsed = num.tryParse(value);
      if (parsed == null) return 0.0;
      if (parsed > 1) return (parsed / 100).clamp(0.0, 1.0).toDouble();
      return parsed.clamp(0.0, 1.0).toDouble();
    }
    return 0.0;
  }
}