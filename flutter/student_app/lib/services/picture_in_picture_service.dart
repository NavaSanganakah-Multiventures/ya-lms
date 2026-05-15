import 'package:flutter/services.dart';

class PictureInPictureService {
  static const MethodChannel _channel = MethodChannel(
    'com.navasanganakah.lms/picture_in_picture',
  );

  static Future<bool> isSupported() async {
    try {
      return await _channel.invokeMethod<bool>('isSupported') ?? false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  static Future<bool> enter() async {
    try {
      return await _channel.invokeMethod<bool>('enter') ?? false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }
}
