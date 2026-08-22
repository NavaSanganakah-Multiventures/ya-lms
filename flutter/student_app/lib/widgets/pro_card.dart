import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// A reusable, modern card with soft shadow, border and rounded corners.
/// Uses the professional AppTheme tokens so the whole app stays consistent.
class ProCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? backgroundColor;
  final double? borderRadius;
  final List<BoxShadow>? shadow;
  final BorderSide? side;
  final VoidCallback? onTap;

  const ProCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.backgroundColor,
    this.borderRadius,
    this.shadow,
    this.side,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: margin ?? EdgeInsets.zero,
      padding: padding ?? const EdgeInsets.all(AppTheme.space4),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppTheme.surfaceOf(context),
        borderRadius: BorderRadius.circular(borderRadius ?? AppTheme.radiusLg),
        border: Border.from_borderSide(
          side ?? BorderSide(color: AppTheme.borderOf(context).withAlphaOpacity(0.6)),
        ),
        boxShadow: shadow ?? AppTheme.softShadow,
      ),
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius ?? AppTheme.radiusLg),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius ?? AppTheme.radiusLg),
          child: card,
        ),
      );
    }
    return card;
  }
}

/// A compact stat/info tile used inside dashboard/profile cards.
class ProInfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Color? iconColor;
  final Color? iconBackgroundColor;

  const ProInfoTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.iconColor,
    this.iconBackgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconBackgroundColor ?? AppTheme.primary.withAlphaOpacity(0.1),
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
          child: Icon(icon, color: iconColor ?? AppTheme.primary, size: 20),
        ),
        const SizedBox(width: AppTheme.space3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
      ],
    );
  }
}
