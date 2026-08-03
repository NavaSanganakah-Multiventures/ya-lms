import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages light / dark / system theme mode for the app.
class ThemeProvider with ChangeNotifier {
 static final String _themeModeKey = 'app_theme_mode';

 ThemeMode _themeMode = ThemeMode.system;

 ThemeMode get themeMode => _themeMode;

 bool get isSystem => _themeMode == ThemeMode.system;
 bool get isDark => _themeMode == ThemeMode.dark;
 bool get isLight => _themeMode == ThemeMode.light;

 ThemeProvider() {
 _loadThemeMode();
 }

 Future<void> _loadThemeMode() async {
 try {
 final prefs = await SharedPreferences.getInstance();
 final saved = prefs.getString(_themeModeKey);
 if (saved != null) {
 _themeMode = ThemeMode.values.firstWhere(
 (e) => e.name == saved,
 orElse: () => ThemeMode.system,
 );
 notifyListeners();
 }
 } catch (e) {
 debugPrint('ThemeProvider load error: $e');
 }
 }

 Future<void> setThemeMode(ThemeMode mode) async {
 if (_themeMode == mode) return;
 _themeMode = mode;
 notifyListeners();
 try {
 final prefs = await SharedPreferences.getInstance();
 await prefs.setString(_themeModeKey, mode.name);
 } catch (e) {
 debugPrint('ThemeProvider save error: $e');
 }
 }

  void toggle() {
  if (_themeMode == ThemeMode.system || _themeMode == ThemeMode.light) {
    setThemeMode(ThemeMode.dark);
  } else {
    setThemeMode(ThemeMode.system);
  }
  }
}
