import 'package:flutter/services.dart';

class PermissionService {
  static const MethodChannel _channel = MethodChannel(
    'com.yagyaashram.lms/permissions',
  );

  static Future<bool> hasCameraAndMic() async {
    try {
      return await _channel.invokeMethod<bool>('hasCameraAndMic') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> requestCameraAndMic() async {
    try {
      final result = await _channel.invokeMethod<bool>('requestCameraAndMic');
      return result ?? false;
    } catch (_) {
      return false;
    }
  }
}
