import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return android;
    }
  }

  // TODO: Replace with your Firebase project config values.
  // These are served to clients and are safe to include in the app bundle.
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    appId: String.fromEnvironment('FIREBASE_APP_ID'),
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    appId: String.fromEnvironment('FIREBASE_APP_ID'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET', defaultValue: 'navasanganakah.firebasestorage.app'),
  );
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    appId: String.fromEnvironment('FIREBASE_APP_ID'),
    iosBundleId: 'com.yagyaashram.lms',
  );
}
