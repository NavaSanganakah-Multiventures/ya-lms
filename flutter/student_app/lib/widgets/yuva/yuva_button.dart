import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Yuva Edition button variants: primary gradient, secondary, outline, ghost, icon.
class YuvaButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final YuvaButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final double? height;
  final EdgeInsetsGeometry? padding;

  const YuvaButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = YuvaButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.height,
    this.padding,
  });

  const YuvaButton.primary({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.height,
    this.padding,
  }) : variant = YuvaButtonVariant.primary;

  const YuvaButton.secondary({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.height,
    this.padding,
  }) : variant = YuvaButtonVariant.secondary;

  const YuvaButton.outline({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.height,
    this.padding,
  }) : variant = YuvaButtonVariant.outline;

  const YuvaButton.ghost({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.height,
    this.padding,
  }) : variant = YuvaButtonVariant.ghost;

  @override
  Widget build(BuildContext context) {
    final content = isLoading
        ? SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              valueColor: AlwaysStoppedAnimation<Color>(
                variant == YuvaButtonVariant.primary ? AppTheme.surface : AppTheme.primary,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: AppTheme.space2),
              ],
              Text(label),
            ],
          );

    switch (variant) {
      case YuvaButtonVariant.primary:
        return Container(
          decoration: BoxDecoration(
            gradient: AppTheme.auroraGradient,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            boxShadow: AppTheme.mediumShadow,
          ),
          child: ElevatedButton(
            onPressed: isLoading ? null : onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: AppTheme.surface,
              disabledBackgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              minimumSize: Size(double.infinity, height ?? 56),
              padding: padding ?? const EdgeInsets.symmetric(horizontal: AppTheme.space5, vertical: AppTheme.space3),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
              textStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: AppTheme.surface,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            child: content,
          ),
        );
      case YuvaButtonVariant.secondary:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.secondary,
            foregroundColor: AppTheme.surface,
            disabledBackgroundColor: AppTheme.mutedSoft,
            disabledForegroundColor: AppTheme.muted,
            minimumSize: Size(double.infinity, height ?? 56),
            padding: padding ?? const EdgeInsets.symmetric(horizontal: AppTheme.space5, vertical: AppTheme.space3),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
            elevation: 0,
            textStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppTheme.surface,
                  fontWeight: FontWeight.w700,
                ),
          ),
          child: content,
        );
      case YuvaButtonVariant.outline:
        return OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.primary,
            side: const BorderSide(color: AppTheme.primary, width: 1.5),
            minimumSize: Size(double.infinity, height ?? 52),
            padding: padding ?? const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space3),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusMd)),
            textStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w700,
                ),
          ),
          child: content,
        );
      case YuvaButtonVariant.ghost:
        return TextButton(
          onPressed: isLoading ? null : onPressed,
          style: TextButton.styleFrom(
            foregroundColor: AppTheme.primary,
            minimumSize: Size(double.infinity, height ?? 48),
            padding: padding ?? const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space3),
            textStyle: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w700,
                ),
          ),
          child: content,
        );
    }
  }
}

enum YuvaButtonVariant { primary, secondary, outline, ghost }
