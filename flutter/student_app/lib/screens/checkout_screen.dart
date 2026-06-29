import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CheckoutScreen extends StatelessWidget {
  final Map<String, dynamic> item;
  final String itemType;
  final int amountInr;

  const CheckoutScreen({
    super.key,
    required this.item,
    required this.itemType,
    required this.amountInr,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      backgroundColor: AppTheme.background,
      body: Center(
        child: Text(
          'Checkout: ₹$amountInr',
          style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18),
        ),
      ),
    );
  }
}
