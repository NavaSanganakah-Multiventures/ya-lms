import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CenterNavItem extends StatefulWidget {
  final VoidCallback onTap;

  const CenterNavItem({super.key, required this.onTap});

  @override
  State<CenterNavItem> createState() => _CenterNavItemState();
}

class _CenterNavItemState extends State<CenterNavItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        final pulseValue = _pulseAnimation.value;
        final glowOpacity = 0.25 + (pulseValue * 0.35);
        final scale = 1.0 + (pulseValue * 0.03);

        return Transform.scale(
          scale: scale,
          child: Padding(
            padding: const EdgeInsets.only(bottom: AppTheme.space2),
            child: Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                gradient: AppTheme.premiumGradient,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.accent
                        .withAlpha((100 * glowOpacity).round()),
                    blurRadius: 16 + (pulseValue * 8),
                    spreadRadius: 2 + (pulseValue * 2),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: widget.onTap,
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: AppTheme.surface,
                    size: 26,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
