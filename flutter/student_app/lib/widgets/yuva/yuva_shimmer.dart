import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../theme/app_theme.dart';

/// Shimmer wrapper using the Yuva Edition color palette.
class YuvaShimmer extends StatelessWidget {
  final Widget child;

  const YuvaShimmer({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = AppTheme.isDark(context);
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF1A1F2E) : const Color(0xFFEEF2FF),
      highlightColor: isDark ? const Color(0xFF252B3D) : const Color(0xFFF8FAFF),
      child: child,
    );
  }
}

/// Shimmer placeholder card.
class YuvaShimmerCard extends StatelessWidget {
  final double height;
  final EdgeInsetsGeometry margin;
  final double borderRadius;

  const YuvaShimmerCard({
    super.key,
    this.height = 120,
    this.margin = const EdgeInsets.only(bottom: AppTheme.space4),
    this.borderRadius = AppTheme.radiusLg,
  });

  @override
  Widget build(BuildContext context) {
    return YuvaShimmer(
      child: Container(
        height: height,
        margin: margin,
        decoration: BoxDecoration(
          color: AppTheme.surfaceOf(context),
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}
