import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'api_service.dart';

class IntegrityService {
 static String _jwtKey = 'app_security_jwt';
 static MethodChannel _channel = MethodChannel('com.yagyaashram.lms/play_integrity');

 static Future<void> initializeIntegrity() async {
 if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;

 try {
 final prefs = await SharedPreferences.getInstance();
 final existingToken = prefs.getString(_jwtKey);
 if (existingToken != null && existingToken.isNotEmpty) {
 // Ideally check expiration here
 }

 final random = Random.secure();
 final List<int> nonceBytes = List<int>.generate(16, (_) => random.nextInt(256));
 final String nonce = base64Url.encode(nonceBytes).replaceAll('=', '');
 final String? token = await _channel.invokeMethod<String>('requestIntegrityToken', {
 'nonce': nonce,
 'cloudProjectNumber': "1006899144467",
 });

 if (token != null) {
 final response = await Dio(BaseOptions(baseUrl: ApiService.baseUrl)).post(
 '/api/auth/app-token',
 data: {'token': token},
 options: Options(
 headers: {'Content-Type': 'application/json'},
 sendTimeout: Duration(seconds: 10),
 receiveTimeout: Duration(seconds: 10),
 ),
 );

 if (response.statusCode == 200) {
 final data = response.data;
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
