// Basic Flutter widget test for Adityanveshan Student App.

import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:student_app/main.dart';
import 'package:student_app/providers/auth_provider.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('Student app renders without crashing and shows initial state', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const AdityanveshanApp(),
      ),
    );

    // Root widget should exist
    expect(find.byType(AdityanveshanApp), findsOneWidget);

    // MaterialApp should be present
    expect(find.byType(MaterialApp), findsOneWidget);

    // After pump, should show loading or auth screen — not blank
    await tester.pump();
    final hasScaffold = find.byType(Scaffold).evaluate().isNotEmpty;
    expect(hasScaffold, isTrue, reason: 'App should render a Scaffold');
  });
}
