import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_layout.dart';
import 'services/notification_background.dart';
import 'services/integrity_service.dart';
import 'services/notification_service.dart';
import 'services/picture_in_picture_service.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    // Background handler MUST be registered before runApp
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('[Firebase init error] $e');
    // App continues to function even if Firebase is unavailable.
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const AdityanveshanApp(),
    ),
  );

  WidgetsBinding.instance.addPostFrameCallback((_) {
    IntegrityService.initializeIntegrity();
    NotificationService.instance.init();
    // Register foreground notification handler — shows SnackBar for incoming
    // notifications while the app is in the foreground.
    NotificationService.instance.setOnForeground((title, body, data) {
      // The local notification is shown automatically by NotificationService.
      // Optionally, show a SnackBar for immediate visibility.
      debugPrint('[Notification] foreground: $title — $body');
    });
    // Register tap handler — navigates when user taps a notification.
    NotificationService.instance.setOnTap((url, data) {
      debugPrint('[Notification] tap: $url $data');
    });
    PictureInPictureService.init();
  });
}

class AdityanveshanApp extends StatelessWidget {
  const AdityanveshanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Adityanveshan',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const AuthChecker(),
    );
  }
}

class AuthChecker extends StatelessWidget {
  const AuthChecker({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    if (authProvider.isLoading) {
      return const Scaffold(
        body: DecoratedBox(
          decoration: BoxDecoration(gradient: AppTheme.auroraGradient),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.auto_stories_rounded, color: AppTheme.surface, size: 52),
                SizedBox(height: 18),
                CircularProgressIndicator(color: Colors.white),
                SizedBox(height: 14),
                Text('Adityanveshan loading...', style: TextStyle(color: Colors.white70)),
              ],
            ),
          ),
        ),
      );
    }

    if (authProvider.isAuthenticated) {
      return const MainLayoutScreen();
    } else {
      return const LoginScreen();
    }
  }
}
