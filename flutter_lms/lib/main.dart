import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'services/notification_background.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Register background message handler (must be before runApp)
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Initialize notification service
  await NotificationService().init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final notifService = NotificationService();

    // Set up foreground notification handler
    notifService.setOnForegroundNotification((title, body, data) {
      // TODO: Show in-app snackbar/dialog
      // Example: ScaffoldMessenger.of(context).showSnackBar(...)
    });

    // Set up notification tap handler for navigation
    notifService.setOnNotificationTap((url, data) {
      // TODO: Navigate based on clickUrl
      // Example: GoRouter.of(context).go(url)
      debugPrint('Navigate to: $url');
    });

    return MaterialApp(
      title: 'Adityanveshan',
      debugShowCheckedModeBanner: false,
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset('assets/logo.png', height: 100),
            const SizedBox(height: 20),
            const Text(
              'Adityanveshan',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Yagya Ashram',
              style: TextStyle(color: Colors.orange[400], fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
