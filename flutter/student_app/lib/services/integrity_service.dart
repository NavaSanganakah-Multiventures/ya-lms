import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_play_integrity_wrapper/flutter_play_integrity_wrapper.dart';
import 'api_service.dart';

class IntegrityService {
  static const String _jwtKey = 'app_security_jwt';

  static Future<void> initializeIntegrity() async {
    // Only attempt on Android/real devices in production scenarios if desired
    // For now, let's just attempt it on Android.
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;

    try {
       final prefs = await SharedPreferences.getInstance();
       // Check if we already have a valid token (optional: could check expiry if JWT decoded)
       final existingToken = prefs.getString(_jwtKey);
       if (existingToken != null && existingToken.isNotEmpty) {
            // Ideally check expiration here. For simplicity, we assume valid until 403 or we just refresh it on startup.
       }

       // Generate standard nonce
       final String nonce = "${DateTime.now().millisecondsSinceEpoch}1234567890abcdef";

       // Note: Google Cloud Project Number might be required depending on how Play Integrity is set up.
       // The wrapper package might just use the default bound project.
       final wrapper = FlutterPlayIntegrityWrapper();
       final String? token = await wrapper.requestIntegrityToken(
          nonce: nonce,
          cloudProjectNumber: "1006899144467",
       );

       if (token != null) {
          // Send to our backend
          final url = Uri.parse('${ApiService.baseUrl}/api/auth/app-token');
          final response = await http.post(
             url,
             headers: {'Content-Type': 'application/json'},
             body: jsonEncode({'token': token})
          );

          if (response.statusCode == 200) {
             final data = jsonDecode(response.body);
             if (data['token'] != null) {
                 await prefs.setString(_jwtKey, data['token']);
                 debugPrint("App-JWT obtained successfully.");
             }
          } else {
             debugPrint("Failed to get App-JWT: ${response.statusCode}");
          }
       }
    } catch (e) {
       debugPrint("Play Integrity Error: $e");
    }
  }

  static Future<String?> getAppJwt() async {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_jwtKey);
  }
}
