import 'package:flutter/material.dart';

class AppTheme {
  // Spiritual + Natural Blended Colors
  static const Color background = Color(0xFFF9F7F1); // Soft Natural Sand/Ivory
  static const Color surface = Color(0xFFFFFFFF); // Pure White for clarity
  static const Color elevated = Color(0xFFF0EBE1); // Earthy light gray-beige
  static const Color border = Color(0xFFE2DACC); // Natural earthy border
  
  static const Color primary = Color(0xFFD97706); // Spiritual Saffron / Earthy Orange
  static const Color primaryLight = Color(0xFFFBBF24); // Warm Gold
  static const Color secondary = Color(0xFF2E7D32); // Natural Forest Green
  static const Color secondaryLight = Color(0xFF81C784); // Soft Leaf Green
  
  static const Color accent = Color(0xFF0F766E); // Deep Teal (Water/Nature)
  static const Color danger = Color(0xFFDC2626); // Red
  static const Color success = Color(0xFF16A34A); // Natural Green
  static const Color muted = Color(0xFFA8A29E); // Warm Stone Grey
  static const Color mutedSoft = Color(0xFFE7E5E4); // Light Stone Grey

  static const Color textPrimary = Color(0xFF292524); // Very Dark Warm Grey/Brown
  static const Color textSecondary = Color(0xFF57534E); // Medium Warm Grey
  static const Color moccasinLight = Color(0xFFFEF3C7); // Warm sunlight

  static const LinearGradient auroraGradient = LinearGradient(
    colors: [Color(0xFFD97706), Color(0xFFFBBF24), Color(0xFF81C784)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sacredGradient = LinearGradient(
    colors: [Color(0xFF2E7D32), Color(0xFF0F766E), Color(0xFFD97706)],
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
        elevation: 2, // Reduced elevation for softer natural look
        shadowColor: const Color(0x1A000000), // Soft black shadow instead of orange
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: border, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface, // Cleaner inputs
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
          elevation: 2,
          shadowColor: const Color(0x33D97706),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.4,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primary),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: textPrimary,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}
