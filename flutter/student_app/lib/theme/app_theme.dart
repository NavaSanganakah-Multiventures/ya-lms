import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Extension helper for Flutter SDK compatibility.
extension AppColorX on Color {
  Color withAlphaOpacity(double opacity) {
    return withAlpha((opacity.clamp(0.0, 1.0) * 255).round());
  }
}

/// Yuva Edition design system for the Adityanveshan student app.
///
/// A bold, energetic palette and modern component tokens built for a
/// youth-first, responsive learning experience. All screens should source
/// design values from here instead of hard-coding colors or typography.
class AppTheme {
  // ── Brand palette (Yuva Edition) ─────────────────────────
  static const Color primary = Color(0xFF4F46E5);        // Indigo 600
  static const Color primaryLight = Color(0xFF818CF8);   // Indigo 400
  static const Color primaryDark = Color(0xFF4338CA);    // Indigo 700
  static const Color secondary = Color(0xFFF97316);      // Coral 500
  static const Color secondaryLight = Color(0xFFFB923C); // Orange 400
  static const Color secondaryDark = Color(0xFFEA580C);   // Orange 600

  static const Color accent = Color(0xFF7C3AED);          // Violet 600
  static const Color accentLight = Color(0xFFA78BFA);    // Violet 400
  static const Color gold = Color(0xFFFBBF24);            // Amber 400
  static const Color goldLight = Color(0xFFFCD34D);       // Amber 300

  static const Color danger = Color(0xFFEF4444);          // Red 500
  static const Color success = Color(0xFF10B981);          // Emerald 500
  static const Color warning = Color(0xFFF59E0B);          // Amber 500
  static const Color info = Color(0xFF3B82F6);             // Blue 500

  // ── Neutral palette ────────────────────────────────────────
  static const Color background = Color(0xFFF8FAFF);     // Cool white
  static const Color surface = Color(0xFFFFFFFF);          // Pure white
  static const Color elevated = Color(0xFFEEF2FF);         // Indigo 50
  static const Color border = Color(0xFFDCE3F1);           // Cool gray border
  static const Color divider = Color(0xFFE2E8F0);
  static const Color muted = Color(0xFF8E95A9);            // Cool gray 500
  static const Color mutedSoft = Color(0xFFE2E8F0);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textTertiary = Color(0xFF64748B);
  static const Color moccasinLight = Color(0xFFF8FAFF);    // Backward compat

  // Dark palette
  static const Color darkBackground = Color(0xFF0B0F19);
  static const Color darkSurface = Color(0xFF15192B);
  static const Color darkElevated = Color(0xFF1E293B);
  static const Color darkBorder = Color(0xFF2A3141);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFFCBD5E1);
  static const Color darkMuted = Color(0xFF64748B);

  // ── Theme-aware color helpers ─────────────────────────────
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

  static Color textTertiaryOf(BuildContext context) =>
      isDark(context) ? darkMuted : textTertiary;

  static Color mutedOf(BuildContext context) =>
      isDark(context) ? darkTextSecondary.withAlphaOpacity(0.7) : muted;

  static Color mutedSoftOf(BuildContext context) =>
      isDark(context) ? darkBorder : mutedSoft;

  static Color moccasinLightOf(BuildContext context) =>
      isDark(context) ? darkElevated : moccasinLight;

  // ── Gradients ──────────────────────────────────────────────
  static const LinearGradient auroraGradient = LinearGradient(
        colors: [Color(0xFF4F46E5), Color(0xFF7C3AED), Color(0xFF818CF8)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static const LinearGradient sacredGradient = LinearGradient(
        colors: [Color(0xFF4F46E5), Color(0xFF0F766E)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static const LinearGradient premiumGradient = LinearGradient(
        colors: [Color(0xFF7C3AED), Color(0xFFF97316)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static const LinearGradient goldGradient = LinearGradient(
        colors: [Color(0xFFFBBF24), Color(0xFFF97316)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static LinearGradient surfaceGradient(BuildContext context) => LinearGradient(
        colors: [surfaceOf(context), elevatedOf(context)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      );

  static LinearGradient backgroundGradient(BuildContext context) =>
      isDark(context)
          ? const LinearGradient(
              colors: [darkBackground, Color(0xFF111827)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            )
          : const LinearGradient(
              colors: [Color(0xFFF8FAFF), Color(0xFFEEF2FF)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            );

  // ── Shape tokens ───────────────────────────────────────────
  static const double radiusXs = 8;
  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 20;
  static const double radiusXl = 28;
  static const double radius2Xl = 36;
  static const double radiusFull = 9999;

  // ── Spacing tokens ─────────────────────────────────────────
  static const double space0 = 0;
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space7 = 32;
  static const double space8 = 40;
  static const double space9 = 48;
  static const double space10 = 64;

  // ── Shadows ────────────────────────────────────────────────
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: primary.withAlphaOpacity(0.08),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get mediumShadow => [
        BoxShadow(
          color: primary.withAlphaOpacity(0.10),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get floatingShadow => [
        BoxShadow(
          color: primary.withAlphaOpacity(0.15),
          blurRadius: 32,
          offset: const Offset(0, 12),
        ),
      ];

  static List<BoxShadow> get innerShadow => [
        BoxShadow(
          color: primary.withAlphaOpacity(0.06),
          blurRadius: 10,
          offset: const Offset(0, 2),
        ),
      ];

  // Razorpay / Webview theme colour (hex without #).
  static String primaryHex = '4F46E5';

  // ── Typography ─────────────────────────────────────────────
  static TextTheme _buildTextTheme(Color primaryText, Color secondaryText, Color tertiaryText) {
    final base = GoogleFonts.poppinsTextTheme();
    return base.copyWith(
      displayLarge: GoogleFonts.poppins(
        fontSize: 40,
        fontWeight: FontWeight.w800,
        letterSpacing: -1.2,
        height: 1.1,
        color: primaryText,
      ),
      displayMedium: GoogleFonts.poppins(
        fontSize: 34,
        fontWeight: FontWeight.w800,
        letterSpacing: -1,
        height: 1.15,
        color: primaryText,
      ),
      headlineLarge: GoogleFonts.poppins(
        fontSize: 28,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.8,
        height: 1.2,
        color: primaryText,
      ),
      headlineMedium: GoogleFonts.poppins(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.6,
        height: 1.25,
        color: primaryText,
      ),
      titleLarge: GoogleFonts.poppins(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        height: 1.3,
        color: primaryText,
      ),
      titleMedium: GoogleFonts.poppins(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
        height: 1.35,
        color: primaryText,
      ),
      titleSmall: GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
        height: 1.4,
        color: primaryText,
      ),
      bodyLarge: GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        height: 1.6,
        color: secondaryText,
      ),
      bodyMedium: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.55,
        color: secondaryText,
      ),
      bodySmall: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: tertiaryText,
      ),
      labelLarge: GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.3,
        color: surface,
      ),
      labelMedium: GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.3,
        color: surface,
      ),
    );
  }

  static TextTheme get _textTheme => _buildTextTheme(textPrimary, textSecondary, textTertiary);
  static TextTheme get _darkTextTheme => _buildTextTheme(darkTextPrimary, darkTextSecondary, darkMuted);

  // ── Component themes ───────────────────────────────────────
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
      fontFamily: GoogleFonts.inter().fontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: _textTheme.titleLarge,
        iconTheme: const IconThemeData(color: textPrimary, size: 24),
        actionsIconTheme: const IconThemeData(color: textPrimary, size: 24),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: BorderSide(color: border.withAlphaOpacity(0.8)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        labelStyle: GoogleFonts.inter(color: textTertiary, fontWeight: FontWeight.w500),
        hintStyle: GoogleFonts.inter(color: muted),
        helperStyle: GoogleFonts.inter(color: textTertiary, fontSize: 12),
        prefixIconColor: textTertiary,
        contentPadding: const EdgeInsets.symmetric(horizontal: space4, vertical: space4 + space2),
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
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: danger, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: surface,
          disabledBackgroundColor: mutedSoft,
          disabledForegroundColor: muted,
          minimumSize: const Size.fromHeight(56),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: space5, vertical: space3 + space1),
          textStyle: _textTheme.titleSmall?.copyWith(color: surface, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          side: const BorderSide(color: primary, width: 1.5),
          minimumSize: const Size.fromHeight(52),
          padding: const EdgeInsets.symmetric(horizontal: space4, vertical: space3),
          textStyle: _textTheme.titleSmall?.copyWith(color: primary, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: textPrimary,
          backgroundColor: elevated,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusSm)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: textPrimary,
        contentTextStyle: GoogleFonts.inter(color: surface),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
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
        selectedColor: primary.withAlphaOpacity(0.12),
        labelStyle: GoogleFonts.inter(color: textPrimary, fontWeight: FontWeight.w600, fontSize: 13),
        secondaryLabelStyle: GoogleFonts.inter(color: primary, fontWeight: FontWeight.w700, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusFull)),
        side: BorderSide.none,
      ),
      dividerTheme: const DividerThemeData(
        color: divider,
        thickness: 1,
        space: 1,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: accent,
        foregroundColor: surface,
        elevation: 0,
        shape: const CircleBorder(),
      ),
    );
  }

  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryLight,
      brightness: Brightness.dark,
      primary: primaryLight,
      secondary: secondaryLight,
      tertiary: accentLight,
      surface: darkSurface,
      error: const Color(0xFFEF4444),
    );

    return lightTheme.copyWith(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      colorScheme: colorScheme,
      textTheme: _darkTextTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: darkBackground,
        foregroundColor: darkTextPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: _darkTextTheme.titleLarge,
        iconTheme: const IconThemeData(color: darkTextPrimary, size: 24),
      ),
      cardTheme: CardThemeData(
        color: darkSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: BorderSide(color: darkBorder),
        ),
      ),
      inputDecorationTheme: lightTheme.inputDecorationTheme.copyWith(
        fillColor: darkElevated,
        labelStyle: GoogleFonts.inter(color: darkMuted, fontWeight: FontWeight.w500),
        hintStyle: GoogleFonts.inter(color: darkMuted),
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
          borderSide: const BorderSide(color: primaryLight, width: 2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: surface,
          disabledBackgroundColor: darkBorder,
          disabledForegroundColor: darkMuted,
          minimumSize: const Size.fromHeight(56),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: space5, vertical: space3 + space1),
          textStyle: _darkTextTheme.titleSmall?.copyWith(color: surface, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryLight,
          side: BorderSide(color: primaryLight.withAlphaOpacity(0.8), width: 1.5),
          minimumSize: const Size.fromHeight(52),
          padding: const EdgeInsets.symmetric(horizontal: space4, vertical: space3),
          textStyle: _darkTextTheme.titleSmall?.copyWith(color: primaryLight, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: darkElevated,
        selectedColor: primary.withAlphaOpacity(0.2),
        labelStyle: GoogleFonts.inter(color: darkTextPrimary, fontWeight: FontWeight.w600, fontSize: 13),
        secondaryLabelStyle: GoogleFonts.inter(color: primaryLight, fontWeight: FontWeight.w700, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusFull)),
        side: BorderSide.none,
      ),
      dividerTheme: const DividerThemeData(
        color: darkBorder,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: darkElevated,
        contentTextStyle: GoogleFonts.inter(color: darkTextPrimary),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
        actionTextColor: primaryLight,
      ),
    );
  }
}
