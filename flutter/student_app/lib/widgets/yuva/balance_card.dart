import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'yuva_card.dart';

class BalanceCard extends StatelessWidget {
  final Map<String, dynamic>? balanceData;

  const BalanceCard({super.key, this.balanceData});

  @override
  Widget build(BuildContext context) {
    final balanceInr = balanceData?['balance_rupees'] ?? 0;
    final balance = balanceInr is num
        ? balanceInr
        : double.tryParse(balanceInr.toString()) ?? 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: YuvaCard(
        gradient: AppTheme.auroraGradient,
        padding: const EdgeInsets.all(AppTheme.space5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Wallet Balance',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.surface.withAlphaOpacity(0.85),
                        fontSize: 16,
                      ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.surface.withAlphaOpacity(0.2),
                    borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.account_balance_wallet_rounded, color: AppTheme.surface, size: 14),
                      SizedBox(width: 4),
                      Text(
                        'Adityanveshan Wallet',
                        style: TextStyle(color: AppTheme.surface, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.space3),
            Text(
              '₹${balance.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    color: AppTheme.surface,
                    fontSize: 40,
                  ),
            ),
            const SizedBox(height: AppTheme.space2),
            Text(
              'Use for AI requests, live classes & premium content',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.surface.withAlphaOpacity(0.8),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}