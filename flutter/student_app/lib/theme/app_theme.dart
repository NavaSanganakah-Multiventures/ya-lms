import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static const Color primary = Color(0xFFF97316);
  static const Color primaryLight = Color(0xFFFB923C);
  static const Color secondary = Color(0xFF8B5CF6);
  static const Color secondaryLight = Color(0xFFA78BFA);
  static const Color accent = Color(0xFF06B6D4);
  static const Color success = Color(0xFF22C55E);
  static const Color danger = Color(0xFFEF4444);
  static const Color background = Color(0xFF0F0A1A);
  static const Color surface = Color(0xFF1A1528);
  static const Color elevated = Color(0xFF221E35);
  static const Color border = Color(0xFF2D2843);
  static const Color textPrimary = Color(0xFFFFF7ED);
  static const Color textSecondary = Color(0xFFC4B5E3);
  static const Color muted = Color(0xFF8B7D9C);
  static const Color mutedSoft = Color(0xFF6B5D7C);
  static const Color moccasinLight = Color(0x22FB923C);

  static const LinearGradient sacredGradient = LinearGradient(
    colors: [Color(0xFFF97316), Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient auroraGradient = LinearGradient(
    colors: [Color(0xFF32115F), Color(0xFF1E1B4B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
