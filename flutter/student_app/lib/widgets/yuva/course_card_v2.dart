import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../theme/app_theme.dart';
import '../course_image.dart';
import 'yuva_button.dart';
import 'yuva_card.dart';

class CourseCardV2 extends StatelessWidget {
  final Map<String, dynamic> course;
  final bool isEnrolled;
  final VoidCallback? onTap;
  final VoidCallback? onBuyNow;
  final int index;

  const CourseCardV2({
    super.key,
    required this.course,
    this.isEnrolled = false,
    this.onTap,
    this.onBuyNow,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    final title = (course['title'] ?? 'Course Title').toString();
    final description = (course['description'] ?? '').toString();
    final price = _price(course);

    return YuvaCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppTheme.space3 + 4),
      child: Row(
        children: [
          CourseImage(
            course: course,
            width: 76,
            height: 76,
            borderRadius: AppTheme.radiusMd,
          ),
          const SizedBox(width: AppTheme.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (isEnrolled)
                      Container(
                        margin: const EdgeInsets.only(right: AppTheme.space2),
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.success.withAlphaOpacity(0.12),
                          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                        ),
                        child: Text(
                          'ENROLLED',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                color: AppTheme.success,
                                fontSize: 9,
                              ),
                        ),
                      ),
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: AppTheme.textPrimaryOf(context),
                              fontSize: 15,
                            ),
                      ),
                    ),
                  ],
                ),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: AppTheme.space1),
                  Text(
                    description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.textSecondaryOf(context),
                        ),
                  ),
                ],
                const SizedBox(height: AppTheme.space2 + 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      price > 0 ? '₹${price.toStringAsFixed(2)}' : 'Free',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppTheme.success,
                            fontSize: 15,
                          ),
                    ),
                    if (!isEnrolled && price > 0 && onBuyNow != null)
                      YuvaButton.secondary(
                        label: 'Buy',
                        onPressed: onBuyNow,
                        height: 34,
                      )
                    else if (isEnrolled)
                      Container(
                        padding: const EdgeInsets.all(AppTheme.space1 + 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withAlphaOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.arrow_forward_rounded,
                            color: AppTheme.primary, size: 16),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    )
        .animate(delay: (index * 60).ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0, duration: 400.ms);
  }

  num _price(Map<String, dynamic> course) {
    final raw = course['price_rupees'] ?? course['price'];
    if (raw is num) return raw;
    if (raw is String) return num.tryParse(raw) ?? 0;
    return 0;
  }
}