import 'dart:async';
import 'package:flutter/services.dart';
import 'live_class_pip_manager.dart';

class PictureInPictureService {
 static MethodChannel _channel = MethodChannel(
 'com.yagyaashram.lms/picture_in_picture',
 );

 // ── PiP state stream from Android native ──────────────────
 static final StreamController<bool> _pipStateController =
 StreamController<bool>.broadcast();
 static Stream<bool> get onPipModeChanged => _pipStateController.stream;

 /// Must be called once during app startup to register the listener
 /// for native → Flutter PiP state changes.
 static void init() {
 _channel.setMethodCallHandler((call) async {
 switch (call.method) {
 case 'onPipModeChanged':
 final isInPip = call.arguments as bool? ?? false;
 _pipStateController.add(isInPip);
 LiveClassPipManager.instance.onOsPipModeChanged(isInPip);
 return true;
 default:
 return null;
 }
 });
 }

 // ── Public API ────────────────────────────────────────────

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

 /// Set PiP remote actions (e.g. mic toggle).
 /// [micEnabled] is the current mic state so Android shows the correct icon.
 static Future<void> updatePiPActions({bool micEnabled = true}) async {
 try {
 await _channel.invokeMethod('updateActions', {
 'micEnabled': micEnabled,
 });
 } on MissingPluginException {
 // PiP not available — ignore
 } on PlatformException {
 // ignore
 }
 }

 /// Cleanup — call when app exits.
 static void dispose() {
 _channel.setMethodCallHandler(null);
 }
}
