import 'package:flutter/material.dart';
import 'responsive.dart';

/// Adaptive sizing helpers that scale based on screen width.
///
/// All values return mobile-optimised sizes on small screens and
/// progressively larger sizes on tablet/desktop.

/// Scale factor relative to a 375px design width (iPhone SE / small phone).
/// On wider screens padding, fonts, and icons grow proportionally.
double _scale(BuildContext context, double mobileSize) {
  final width = MediaQuery.of(context).size.width;
  // Clamp between 0.85× and 1.4× so it never goes too extreme
  final factor = (width / 375).clamp(0.85, 1.4);
  return mobileSize * factor;
}

/// Horizontal screen-edge padding for the current breakpoint.
double screenHorizontalPadding(BuildContext context) {
  if (isMobile(context)) return 16.0;
  if (isTablet(context)) return 24.0;
  return 32.0;
}

/// Vertical spacing between sections.
double screenVerticalSpacing(BuildContext context) {
  if (isMobile(context)) return 16.0;
  if (isTablet(context)) return 20.0;
  return 24.0;
}

/// Adaptive font size — supply the mobile size, tablet/desktop scale up.
double adaptiveFontSize(BuildContext context, double mobileSize) {
  if (isDesktop(context)) return mobileSize * 1.15;
  if (isTablet(context)) return mobileSize * 1.075;
  return mobileSize;
}

/// Adaptive card/section width as a fraction of screen width.
/// Falls back to a fixed max so cards never get absurdly wide.
double adaptiveCardWidth(BuildContext context, {double maxWidth = 400}) {
  final available = MediaQuery.of(context).size.width - screenHorizontalPadding(context) * 2;
  return available.clamp(200.0, maxWidth);
}

/// Adaptive icon size.
double adaptiveIconSize(BuildContext context, double mobileSize) {
  return _scale(context, mobileSize).clamp(mobileSize * 0.85, mobileSize * 1.3);
}

/// Adaptive horizontal padding for cards / sections.
EdgeInsets adaptivePadding(BuildContext context,
    {double horizontal = 16, double vertical = 12}) {
  final factor = isDesktop(context) ? 1.4 : (isTablet(context) ? 1.2 : 1.0);
  return EdgeInsets.symmetric(
    horizontal: horizontal * factor,
    vertical: vertical * factor,
  );
}

/// Adaptive edge padding with independent axes.
EdgeInsets adaptiveEdgeInsets(
  BuildContext context, {
  double left = 16,
  double top = 12,
  double right = 16,
  double bottom = 12,
}) {
  final factor = isDesktop(context) ? 1.4 : (isTablet(context) ? 1.2 : 1.0);
  return EdgeInsets.fromLTRB(
    left * factor,
    top * factor,
    right * factor,
    bottom * factor,
  );
}
