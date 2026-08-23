import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Modern surface card used across the Yuva Edition UI.
class YuvaCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final BorderRadiusGeometry? borderRadius;
  final Gradient? gradient;
  final List<BoxShadow>? shadow;
  final BorderSide? side;
  final VoidCallback? onTap;
  final double? width;
  final double? height;

  const YuvaCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.borderRadius,
    this.gradient,
    this.shadow,
    this.side,
    this.onTap,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(AppTheme.radiusLg);
    final decoration = BoxDecoration(
      color: gradient == null ? (backgroundColor ?? AppTheme.surfaceOf(context)) : null,
      gradient: gradient,
      borderRadius: radius,
      border: Border.fromBorderSide(
        side ?? BorderSide(
          color: AppTheme.borderOf(context).withAlphaOpacity(0.7),
          width: 1,
        ),
      ),
      boxShadow: shadow ?? AppTheme.softShadow,
    );

    Widget card = Container(
      width: width,
      height: height,
      margin: margin ?? EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        child: Padding(
          padding: padding ?? const EdgeInsets.all(AppTheme.space4),
          child: child,
        ),
      ),
    );

    if (onTap != null) {
      card = ClipRRect(
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          splashColor: AppTheme.primary.withAlphaOpacity(0.08),
          highlightColor: AppTheme.primary.withAlphaOpacity(0.04),
          child: card,
        ),
      );
    }

    return card;
  }
}
