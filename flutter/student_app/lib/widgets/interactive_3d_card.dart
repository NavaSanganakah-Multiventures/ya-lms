import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class Interactive3DCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final BorderRadiusGeometry? borderRadius;

  final Color? color;
  final Gradient? gradient;

  const Interactive3DCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.margin = EdgeInsets.zero,
    this.borderRadius,
    this.color,
    this.gradient,
  });

  @override
  State<Interactive3DCard> createState() => _Interactive3DCardState();
}

class _Interactive3DCardState extends State<Interactive3DCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _tiltAnimation;

  bool _isPressed = false;
  Offset _tiltOffset = Offset.zero;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      reverseDuration: const Duration(milliseconds: 200),
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _tiltAnimation = Tween<double>(begin: 0.0, end: 0.05).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onPointerMove(PointerMoveEvent event, Size size) {
    if (!_isPressed) return;

    // Calculate tilt based on touch position relative to center
    final localPosition = event.localPosition;
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    final dx = (localPosition.dx - centerX) / centerX;
    final dy = (localPosition.dy - centerY) / centerY;

    setState(() {
      _tiltOffset = Offset(
        dx.clamp(-1.0, 1.0).toDouble(),
        dy.clamp(-1.0, 1.0).toDouble(),
      );
    });
  }

  void _onPointerDown(PointerDownEvent event) {
    setState(() => _isPressed = true);
    _controller.forward();
  }

  void _onPointerUp(PointerUpEvent event) {
    setState(() {
      _isPressed = false;
      _tiltOffset = Offset.zero;
    });
    _controller.reverse();
    if (widget.onTap != null) {
      widget.onTap!();
    }
  }

  void _onPointerCancel(PointerCancelEvent event) {
    setState(() {
      _isPressed = false;
      _tiltOffset = Offset.zero;
    });
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final br = widget.borderRadius ?? BorderRadius.circular(AppTheme.radiusLg);

    return LayoutBuilder(
      builder: (context, constraints) {
        return Listener(
          onPointerDown: _onPointerDown,
          onPointerUp: _onPointerUp,
          onPointerCancel: _onPointerCancel,
          onPointerMove: (event) => _onPointerMove(event, Size(constraints.maxWidth, constraints.maxHeight)),
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              // Create 3D transformation matrix
              final matrix = Matrix4.identity()
                ..setEntry(3, 2, 0.001); // Perspective

              if (_isPressed) {
                // Apply tilt based on touch position
                matrix.rotateX(-_tiltOffset.dy * _tiltAnimation.value);
                matrix.rotateY(_tiltOffset.dx * _tiltAnimation.value);
              }

              // Instead of matrix.scaleByDouble, use standard scale
              matrix.scale(_scaleAnimation.value, _scaleAnimation.value, 1.0);

              return Transform(
                transform: matrix,
                alignment: FractionalOffset.center,
                child: Container(
                  margin: widget.margin,
                  padding: widget.padding,
                  decoration: BoxDecoration(
                    color: widget.gradient == null ? (widget.color ?? AppTheme.surfaceOf(context)) : null,
                    gradient: widget.gradient,
                    borderRadius: br,
                    border: Border.all(
                      color: AppTheme.borderOf(context),
                      width: 0.5,
                    ),
                    boxShadow: _isPressed
                        ? AppTheme.softShadow
                        : AppTheme.floatingShadow,
                  ),
                  child: widget.child,
                ),
              );
            },
          ),
        );
      }
    );
  }
}
