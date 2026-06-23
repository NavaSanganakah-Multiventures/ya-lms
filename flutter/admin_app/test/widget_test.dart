import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:admin_app/main.dart';
import 'package:admin_app/providers/admin_provider.dart';
import 'package:flutter/material.dart';

void main() {
  testWidgets('Admin app renders login screen initially', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AdminProvider()),
        ],
        child: const AdminApp(),
      ),
    );

    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
