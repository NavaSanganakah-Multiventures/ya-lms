// Basic Flutter widget test for Adityanveshan Student App.

import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:student_app/main.dart';
import 'package:student_app/providers/auth_provider.dart';

void main() {
  testWidgets('App should render without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const AdityanveshanApp(),
      ),
    );

    // App should show loading or login screen
    expect(find.byType(AdityanveshanApp), findsOneWidget);
  });
}
