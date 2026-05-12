import 'package:flutter/material.dart';

class AppTheme {
  static const Color background = Color(0xFF07030F);
  static const Color surface = Color(0xFF130D1F);
  static const Color elevated = Color(0xFF1E1530);
  static const Color border = Color(0xFF33264A);
  static const Color primary = Color(0xFFFF7A1A);
  static const Color primaryLight = Color(0xFFFFB86B);
  static const Color secondary = Color(0xFF7C3AED);
  static const Color secondaryLight = Color(0xFFA78BFA);
  static const Color accent = Color(0xFF14B8A6);
  static const Color danger = Color(0xFFEF4444);
  static const Color success = Color(0xFF22C55E);
  static const Color muted = Color(0xFFC4B5FD);
  static const Color mutedSoft = Color(0xFF8B7CA8);

  static const LinearGradient auroraGradient = LinearGradient(
    colors: [Color(0xFF32115F), Color(0xFF5A260F), Color(0xFF071F1D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient sacredGradient = LinearGradient(
    colors: [Color(0xFFFF7A1A), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static ThemeData get darkTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.dark,
      primary: primary,
      secondary: secondary,
      tertiary: accent,
      surface: surface,
      error: danger,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      colorScheme: colorScheme,
      fontFamily: 'Roboto',
      visualDensity: VisualDensity.adaptivePlatformDensity,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w900,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xD8130D1F),
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
          side: const BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xCC1E1530),
        labelStyle: const TextStyle(color: muted),
        hintStyle: const TextStyle(color: mutedSoft),
        prefixIconColor: muted,
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
          borderSide: const BorderSide(color: primaryLight, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFF2A2138),
          disabledForegroundColor: mutedSoft,
          minimumSize: const Size.fromHeight(54),
          elevation: 0,
          shadowColor: const Color(0x66FF7A1A),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.4,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primaryLight),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: const Color(0x661E1530),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: elevated,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
