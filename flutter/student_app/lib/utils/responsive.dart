import 'package:flutter/material.dart';

/// Breakpoints for responsive layout
class Breakpoints {
 static double mobile = 600;
 static double tablet = 900;
}

/// Returns true when the screen width is in the mobile range (< 600)
bool isMobile(BuildContext context) {
 return MediaQuery.of(context).size.width < Breakpoints.mobile;
}

/// Returns true when the screen width is in the tablet range (600–900)
bool isTablet(BuildContext context) {
 final w = MediaQuery.of(context).size.width;
 return w >= Breakpoints.mobile && w < Breakpoints.tablet;
}

/// Returns true when the screen width is desktop/large (≥ 900)
bool isDesktop(BuildContext context) {
 return MediaQuery.of(context).size.width >= Breakpoints.tablet;
}

/// Responsive wrapper with breakpoint-aware layout.
///
/// * **Mobile** (<600): full-width with 16px horizontal padding
/// * **Tablet** (600–900): max-width 720px, centered, 24px padding
/// * **Desktop** (≥900): max-width 900px, centered, 32px padding
class ResponsiveLayout extends StatelessWidget {
 final Widget child;
 ResponsiveLayout({super.key, required this.child});

 @override
 Widget build(BuildContext context) {
 final screenWidth = MediaQuery.of(context).size.width;
 final horizontalPadding = isMobile(context) ? 16.0 : (isTablet(context) ? 24.0 : 32.0);

 return Center(
 child: ConstrainedBox(
 constraints: BoxConstraints(
 maxWidth: isDesktop(context) ? 900 : (isTablet(context) ? 720 : screenWidth),
 ),
 child: Padding(
 padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
 child: child,
 ),
 ),
 );
 }
}
