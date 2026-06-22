import 'package:flutter/material.dart';

class AppTheme {
  // Spiritual Adhyatmik Colors: Yellow, Orange, Red, Green, Gold, Silver, Pink, White
  static const Color background = Color(0xFFFFF8E7); // Warm White / Ivory
  static const Color surface = Color(0xFFFFFFFF); // Pure White
  static const Color elevated = Color(0xFFFFF0D4); // Light Gold/Yellow Tint
  static const Color border = Color(0xFFFFD700); // Gold
  static const Color primary = Color(0xFFFF8C00); // Dark Orange
  static const Color primaryLight = Color(0xFFFFD700); // Gold / Yellow
  static const Color secondary = Color(0xFFDC143C); // Crimson Red
  static const Color secondaryLight = Color(0xFFFFC0CB); // Pink
  static const Color accent = Color(0xFF228B22); // Forest Green
  static const Color danger = Color(0xFFFF0000); // Pure Red
  static const Color success = Color(0xFF32CD32); // Lime Green
  static const Color muted = Color(0xFFC0C0C0); // Silver
  static const Color mutedSoft = Color(0xFFE0E0E0); // Light Silver

  // Theme Additions per Code Review
  static const Color textPrimary = Color(0xFF8B0000); // Dark Red
  static const Color textSecondary = Color(0xFF555555); // Dark Gray
  static const Color moccasinLight = Color(0xFFFFE4B5); // Moccasin

  static const LinearGradient auroraGradient = LinearGradient(
    colors: [Color(0xFFFF8C00), Color(0xFFFFD700), Color(0xFFFFC0CB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sacredGradient = LinearGradient(
    colors: [Color(0xFFDC143C), Color(0xFFFF8C00), Color(0xFFFFD700)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
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
      fontFamily: 'Roboto',
      visualDensity: VisualDensity.adaptivePlatformDensity,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
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
        elevation: 4,
        shadowColor: Color(0x40FF8C00), // Orange shadow
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: const BorderSide(color: border, width: 1.5),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: elevated,
        labelStyle: const TextStyle(color: textPrimary),
        hintStyle: const TextStyle(color: muted),
        prefixIconColor: primary,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: primary, width: 2.0),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: mutedSoft,
          disabledForegroundColor: muted,
          minimumSize: const Size.fromHeight(54),
          elevation: 4,
          shadowColor: const Color(0x66FF8C00),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.4,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: secondary),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: surface,
        contentTextStyle: const TextStyle(color: textPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: border),
        ),
      ),
    );
  }
}
