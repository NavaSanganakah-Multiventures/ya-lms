import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

class AppShimmer extends StatelessWidget {
 final Widget child;
 const AppShimmer({super.key, required this.child});

 @override
 Widget build(BuildContext context) {
 final isDark = Theme.of(context).brightness == Brightness.dark;
 return Shimmer.fromColors(
 baseColor: isDark ? Color(0xFF222126) : Color(0xFFECE9E2),
 highlightColor: isDark ? Color(0xFF2E2D32) : Color(0xFFF9F7F1),
 child: child,
 );
 }
}

class ShimmerCard extends StatelessWidget {
 final double height;
 final EdgeInsetsGeometry margin;

 const ShimmerCard({
 super.key,
 this.height = 120,
  this.margin = const EdgeInsets.only(bottom: 16),
 });

 @override
 Widget build(BuildContext context) {
 return AppShimmer(
 child: Container(
 height: height,
 margin: margin,
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 borderRadius: BorderRadius.circular(AppTheme.radiusLg),
 ),
 ),
 );
 }
}

class ShimmerCircle extends StatelessWidget {
 final double size;
 const ShimmerCircle({super.key, this.size = 48});

 @override
 Widget build(BuildContext context) {
 return AppShimmer(
 child: Container(
 width: size,
 height: size,
 decoration: BoxDecoration(
 color: AppTheme.surfaceOf(context),
 shape: BoxShape.circle,
 ),
 ),
 );
 }
}
