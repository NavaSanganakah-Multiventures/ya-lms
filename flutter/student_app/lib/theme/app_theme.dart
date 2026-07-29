import 'package:flutter/material.dart';

/// Flutter SDK compatibility helpers.
///
/// `Color.withValues(alpha:)` and `Color.toARGB32()` are Flutter 3.27+ APIs.
/// Using [withAlphaOpacity] keeps the app compiling on older and newer
/// stable channels without losing the desired transparency behaviour.
extension AppColorX on Color {
 /// Returns this color with an opacity value in the range [0.0, 1.0].
 Color withAlphaOpacity(double opacity) {
 return withAlpha((opacity.clamp(0.0, 1.0) * 255).round());
 }
}

class AppTheme {
 // ── Brand palette ──────────────────────────────────────────
 static Color background = Color(0xFFF4F6F4); // Warm ivory
 static Color surface = Color(0xFFFFFFFF);
 static Color elevated = Color(0xFFF0EBE1);
 static Color border = Color(0xFFE2DACC);

 static Color primary = Color(0xFF2E7D32); // Forest green
 static Color primaryLight = Color(0xFF4CAF50); // Green
 static Color primaryDark = Color(0xFFB45309);
 static Color secondary = Color(0xFF2E7D32); // Forest green
 static Color secondaryLight = Color(0xFF81C784);

 static Color accent = Color(0xFF0F766E); // Deep teal
 static Color accentLight = Color(0xFF2DD4BF);
 static Color danger = Color(0xFFDC2626);
 static Color success = Color(0xFF16A34A);
 static Color warning = Color(0xFFF59E0B);
 static Color muted = Color(0xFFA8A29E);
 static Color mutedSoft = Color(0xFFE7E5E4);

 static Color textPrimary = Color(0xFF292524);
 static Color textSecondary = Color(0xFF57534E);
 static Color moccasinLight = Color(0xFFFEF3C7);

 // Dark palette (used when system dark mode is active)
 static Color darkBackground = Color(0xFF0F0E12);
 static Color darkSurface = Color(0xFF1A191D);
 static Color darkElevated = Color(0xFF242326);
 static Color darkBorder = Color(0xFF2E2D31);
 static Color darkTextPrimary = Color(0xFFF2F2F2);
 static Color darkTextSecondary = Color(0xFFBFBFBF);

 // ── Theme-aware color helpers ──────────────────────────────
 static bool isDark(BuildContext context) =>
 Theme.of(context).brightness == Brightness.dark;

 static Color backgroundOf(BuildContext context) =>
 isDark(context) ? darkBackground : background;

 static Color surfaceOf(BuildContext context) =>
 isDark(context) ? darkSurface : surface;

 static Color elevatedOf(BuildContext context) =>
 isDark(context) ? darkElevated : elevated;

 static Color borderOf(BuildContext context) =>
 isDark(context) ? darkBorder : border;

 static Color textPrimaryOf(BuildContext context) =>
 isDark(context) ? darkTextPrimary : textPrimary;

 static Color textSecondaryOf(BuildContext context) =>
 isDark(context) ? darkTextSecondary : textSecondary;

 static Color mutedOf(BuildContext context) =>
 isDark(context) ? darkTextSecondary.withAlphaOpacity(0.8) : muted;

 static Color mutedSoftOf(BuildContext context) =>
 isDark(context) ? darkBorder : mutedSoft;

 static Color moccasinLightOf(BuildContext context) =>
 isDark(context) ? Color(0xFF2A2418) : moccasinLight;

 // ── Gradients ──────────────────────────────────────────────
 static LinearGradient auroraGradient = LinearGradient(
 colors: [Color(0xFF2E7D32), Color(0xFF4CAF50), Color(0xFF81C784)],
 begin: Alignment.topLeft,
 end: Alignment.bottomRight,
 );

 static LinearGradient sacredGradient = LinearGradient(
 colors: [Color(0xFF2E7D32), Color(0xFF0F766E), Color(0xFF2E7D32)],
 begin: Alignment.topLeft,
 end: Alignment.bottomRight,
 );

 static LinearGradient surfaceGradient(BuildContext context) => LinearGradient(
 colors: [surfaceOf(context), elevatedOf(context)],
 begin: Alignment.topCenter,
 end: Alignment.bottomCenter,
 );

 // ── Shape / spacing tokens ─────────────────────────────────
 static double radiusSm = 12;
 static double radiusMd = 18;
 static double radiusLg = 24;
 static double radiusXl = 32;

 static double padSm = 8;
 static double padMd = 16;
 static double padLg = 24;

 static List<BoxShadow> get softShadow => [
 BoxShadow(
 color: Color(0x1A000000),
 blurRadius: 24,
 offset: Offset(0, 8),
 ),
 ];

 static List<BoxShadow> get floatingShadow => [
 BoxShadow(
 color: Color(0x40000000),
 blurRadius: 20,
 offset: Offset(0, 4),
 ),
 ];

 // Static hex string for Razorpay / Webview theme colour.
 static String primaryHex = 'D97706';

 // ── Text themes ────────────────────────────────────────────
 static TextTheme get _textTheme => TextTheme(
 titleLarge: TextStyle(
 fontSize: 22,
 fontWeight: FontWeight.w900,
 letterSpacing: -0.4,
 color: textPrimary,
 ),
 titleMedium: TextStyle(
 fontSize: 18,
 fontWeight: FontWeight.w800,
 letterSpacing: -0.3,
 color: textPrimary,
 ),
 titleSmall: TextStyle(
 fontSize: 14,
 fontWeight: FontWeight.w700,
 letterSpacing: 0,
 color: textPrimary,
 ),
 bodyLarge: TextStyle(
 fontSize: 16,
 fontWeight: FontWeight.w400,
 height: 1.55,
 color: textSecondary,
 ),
 bodyMedium: TextStyle(
 fontSize: 14,
 fontWeight: FontWeight.w400,
 height: 1.5,
 color: textSecondary,
 ),
 labelLarge: TextStyle(
 fontSize: 14,
 fontWeight: FontWeight.w700,
 letterSpacing: 0.4,
 color: surface,
 ),
 );

 static TextTheme get _darkTextTheme => _textTheme.copyWith(
 titleLarge: _textTheme.titleLarge?.copyWith(color: darkTextPrimary),
 titleMedium: _textTheme.titleMedium?.copyWith(color: darkTextPrimary),
 titleSmall: _textTheme.titleSmall?.copyWith(color: darkTextPrimary),
 bodyLarge: _textTheme.bodyLarge?.copyWith(color: darkTextSecondary),
 bodyMedium: _textTheme.bodyMedium?.copyWith(color: darkTextSecondary),
 );

 static ThemeData get lightTheme {
 final colorScheme = ColorScheme.fromSeed(
 seedColor: primary,
 brightness: Brightness.light,
 primary: primary,
 secondary: secondary,
 tertiary: accent,
 surface: surface,
 error: danger,
 );

 return ThemeData(
 useMaterial3: true,
 brightness: Brightness.light,
 scaffoldBackgroundColor: background,
 colorScheme: colorScheme,
 visualDensity: VisualDensity.adaptivePlatformDensity,
 textTheme: _textTheme,
 appBarTheme: AppBarTheme(
 backgroundColor: surface,
 foregroundColor: textPrimary,
 elevation: 0,
 scrolledUnderElevation: 1,
 centerTitle: false,
 surfaceTintColor: surface,
 titleTextStyle: TextStyle(
 color: textPrimary,
 fontSize: 18,
 fontWeight: FontWeight.w900,
 letterSpacing: -0.2,
 ),
 iconTheme: IconThemeData(color: textPrimary),
 ),
 cardTheme: CardThemeData(
 color: surface,
 elevation: 1,
 shadowColor: Color(0x1A000000),
 margin: EdgeInsets.zero,
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(radiusLg),
 side: BorderSide(color: border, width: 1.0),
 ),
 ),
 inputDecorationTheme: InputDecorationTheme(
 filled: true,
 fillColor: surface,
 labelStyle: TextStyle(color: textPrimary),
 hintStyle: TextStyle(color: muted),
 prefixIconColor: primary,
 contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 18),
 border: OutlineInputBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 borderSide: BorderSide(color: border),
 ),
 enabledBorder: OutlineInputBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 borderSide: BorderSide(color: border),
 ),
 focusedBorder: OutlineInputBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 borderSide: BorderSide(color: primary, width: 2.0),
 ),
 ),
 elevatedButtonTheme: ElevatedButtonThemeData(
 style: ElevatedButton.styleFrom(
 backgroundColor: primary,
 foregroundColor: surface,
 disabledBackgroundColor: mutedSoft,
 disabledForegroundColor: muted,
 minimumSize: Size.fromHeight(54),
 elevation: 2,
 shadowColor: Color(0x33D97706),
 textStyle: TextStyle(
 fontSize: 16,
 fontWeight: FontWeight.w900,
 letterSpacing: 0.4,
 ),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
 ),
 ),
 textButtonTheme: TextButtonThemeData(
 style: TextButton.styleFrom(foregroundColor: primary),
 ),
 iconButtonTheme: IconButtonThemeData(
 style: IconButton.styleFrom(
 foregroundColor: textPrimary,
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
 ),
 ),
 snackBarTheme: SnackBarThemeData(
 backgroundColor: textPrimary,
 contentTextStyle: TextStyle(color: surface),
 behavior: SnackBarBehavior.floating,
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 ),
 actionTextColor: primaryLight,
 ),
 bottomNavigationBarTheme: BottomNavigationBarThemeData(
 backgroundColor: surface,
 selectedItemColor: primary,
 unselectedItemColor: muted,
 elevation: 0,
 type: BottomNavigationBarType.fixed,
 showSelectedLabels: true,
 showUnselectedLabels: true,
 ),
 chipTheme: ChipThemeData(
 backgroundColor: elevated,
 selectedColor: primary.withAlphaOpacity(0.15),
 labelStyle: TextStyle(color: textPrimary, fontWeight: FontWeight.w700),
 secondaryLabelStyle: TextStyle(color: primary, fontWeight: FontWeight.w800),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
 side: BorderSide(color: border),
 ),
 dividerTheme: DividerThemeData(
 color: border,
 thickness: 1,
 space: 24,
 ),
 );
 }

 static ThemeData get darkTheme {
 final colorScheme = ColorScheme.fromSeed(
 seedColor: primary,
 brightness: Brightness.dark,
 primary: primaryLight,
 secondary: secondaryLight,
 tertiary: accentLight,
 surface: darkSurface,
 error: Color(0xFFEF4444),
 );

 return lightTheme.copyWith(
 brightness: Brightness.dark,
 scaffoldBackgroundColor: darkBackground,
 colorScheme: colorScheme,
 textTheme: _darkTextTheme,
 appBarTheme: AppBarTheme(
 backgroundColor: darkSurface,
 foregroundColor: darkTextPrimary,
 elevation: 0,
 scrolledUnderElevation: 1,
 centerTitle: false,
 surfaceTintColor: darkSurface,
 titleTextStyle: TextStyle(
 color: darkTextPrimary,
 fontSize: 18,
 fontWeight: FontWeight.w900,
 letterSpacing: -0.2,
 ),
 iconTheme: IconThemeData(color: darkTextPrimary),
 ),
 cardTheme: CardThemeData(
 color: darkSurface,
 elevation: 1,
 shadowColor: Color(0x40000000),
 margin: EdgeInsets.zero,
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(radiusLg),
 side: BorderSide(color: darkBorder, width: 1.0),
 ),
 ),
 inputDecorationTheme: lightTheme.inputDecorationTheme.copyWith(
 fillColor: darkElevated,
 labelStyle: TextStyle(color: darkTextPrimary),
 hintStyle: TextStyle(color: muted),
 border: OutlineInputBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 borderSide: BorderSide(color: darkBorder),
 ),
 enabledBorder: OutlineInputBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 borderSide: BorderSide(color: darkBorder),
 ),
 focusedBorder: OutlineInputBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 borderSide: BorderSide(color: primaryLight, width: 2.0),
 ),
 ),
 elevatedButtonTheme: ElevatedButtonThemeData(
 style: ElevatedButton.styleFrom(
 backgroundColor: primary,
 foregroundColor: surface,
 disabledBackgroundColor: darkBorder,
 disabledForegroundColor: muted,
 minimumSize: Size.fromHeight(54),
 elevation: 2,
 textStyle: TextStyle(
 fontSize: 16,
 fontWeight: FontWeight.w900,
 letterSpacing: 0.4,
 ),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
 ),
 ),
 chipTheme: ChipThemeData(
 backgroundColor: darkElevated,
 selectedColor: primary.withAlphaOpacity(0.2),
 labelStyle: TextStyle(color: darkTextPrimary, fontWeight: FontWeight.w700),
 secondaryLabelStyle: TextStyle(color: primaryLight, fontWeight: FontWeight.w800),
 shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
 side: BorderSide(color: darkBorder),
 ),
 dividerTheme: DividerThemeData(
 color: darkBorder,
 thickness: 1,
 space: 24,
 ),
 snackBarTheme: SnackBarThemeData(
 backgroundColor: darkElevated,
 contentTextStyle: TextStyle(color: darkTextPrimary),
 behavior: SnackBarBehavior.floating,
 shape: RoundedRectangleBorder(
 borderRadius: BorderRadius.circular(radiusMd),
 ),
 actionTextColor: primaryLight,
 ),
 );
 }
}
