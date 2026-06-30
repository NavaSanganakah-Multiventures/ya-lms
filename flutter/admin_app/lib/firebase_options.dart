import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    _validateConfig();
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform: $defaultTargetPlatform',
        );
    }
  }

  // TODO: Replace with your Firebase project config values.
  // These match the admin app registered in the same Firebase project.
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    appId: String.fromEnvironment('FIREBASE_APP_ID'),
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCBnwhTTM3w8aiXHxC_4rX6aonhIe3wjqo',
    appId: '1:1006899144467:android:4ae584b37ebc390e555ce6',
    messagingSenderId: '1006899144467',
    projectId: 'navasanganakah',
    storageBucket: 'navasanganakah.firebasestorage.app',
  );
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    appId: String.fromEnvironment('FIREBASE_APP_ID'),
    iosBundleId: 'com.yagyaashram.lms.admin',
  );

  static void _validateConfig() {
    const apiKey = String.fromEnvironment('FIREBASE_API_KEY');
    const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
    const messagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
    const appId = String.fromEnvironment('FIREBASE_APP_ID');

    assert(apiKey.isNotEmpty, 'FIREBASE_API_KEY must not be empty');
    assert(projectId.isNotEmpty, 'FIREBASE_PROJECT_ID must not be empty');
    assert(messagingSenderId.isNotEmpty, 'FIREBASE_MESSAGING_SENDER_ID must not be empty');
    assert(appId.isNotEmpty, 'FIREBASE_APP_ID must not be empty');
  }
}
