import 'package:flutter/material.dart';

class ResponsiveLayout extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final bool center;

  const ResponsiveLayout({
    super.key,
    required this.child,
    this.maxWidth = 800,
    this.center = true,
  });

  @override
  Widget build(BuildContext context) {
    Widget constrainedChild = ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    );

    if (center) {
      return Center(child: constrainedChild);
    }
    return constrainedChild;
  }
}
