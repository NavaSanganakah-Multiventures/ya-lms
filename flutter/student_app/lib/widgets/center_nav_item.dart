import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CenterNavItem extends StatefulWidget {
  final VoidCallback onTap;

  const CenterNavItem({super.key, required this.onTap});

  @override
  State<CenterNavItem> createState() => _CenterNavItemState();
}

class _CenterNavItemState extends State<CenterNavItem> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 2000),
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
        final glowOpacity = 0.3 + (pulseValue * 0.4);
        final scale = 1.0 + (pulseValue * 0.04);

        return Transform.scale(
          scale: scale,
          child: Padding(
            padding: EdgeInsets.only(top: 0),
            child: InkWell(
              onTap: widget.onTap,
              borderRadius: BorderRadius.circular(28),
              child: Container(
                width: 60,
                height: 60,
                margin: EdgeInsets.only(bottom: 4),
                decoration: BoxDecoration(
                  gradient: AppTheme.sacredGradient,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryLight
                          .withAlpha((80 * glowOpacity).round()),
                      blurRadius: 12 + (pulseValue * 8),
                      spreadRadius: 2 + (pulseValue * 4),
                    ),
                  ],
                ),
                child: Icon(
                  Icons.smart_toy_rounded,
                  color: Colors.white,
                  size: 30,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
