import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:admin_app/main.dart';
import 'package:admin_app/providers/admin_provider.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('Admin app renders without crashing and shows initial loading or login state', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AdminProvider()),
        ],
        child: const AdminApp(),
      ),
    );

    // App widget should exist at root
    expect(find.byType(AdminApp), findsOneWidget);

    // Should show either a loading indicator OR the login screen — not a crash
    await tester.pump();
    final hasLoading = find.byType(CircularProgressIndicator).evaluate().isNotEmpty;
    final hasScaffold = find.byType(Scaffold).evaluate().isNotEmpty;
    expect(hasLoading || hasScaffold, isTrue,
        reason: 'App should render either loading or a scaffold');
  });
}
