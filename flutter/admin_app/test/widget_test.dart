import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/main.dart';

void main() {
  testWidgets('Admin app renders dashboard shell', (WidgetTester tester) async {
    await tester.pumpWidget(const AdminApp());

    expect(find.text('Admin Console'), findsOneWidget);
    expect(find.text('Namaste, Admin'), findsOneWidget);
    expect(find.text('Quick Actions'), findsOneWidget);
  });
}
