import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class TransactionRow extends StatelessWidget {
  final Map<String, dynamic> item;
  final int index;

  const TransactionRow({super.key, required this.item, this.index = 0});

  @override
  Widget build(BuildContext context) {
    final amount = num.tryParse(item['change_rupees']?.toString() ?? '0') ?? 0;
    final balanceAfter = item['balance_after_rupees']?.toString() ?? '';
    final isPositive = amount > 0;
    final dateStr = item['created_at']?.toString() ?? '';
    final reason = item['reason']?.toString() ?? 'Transaction';

    return Container(
      margin: const EdgeInsets.only(bottom: AppTheme.space3),
      padding: const EdgeInsets.all(AppTheme.space4),
      decoration: BoxDecoration(
        color: AppTheme.surfaceOf(context),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(color: AppTheme.borderOf(context)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppTheme.space3),
            decoration: BoxDecoration(
              color: isPositive
                  ? AppTheme.success.withAlphaOpacity(0.12)
                  : AppTheme.danger.withAlphaOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isPositive ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
              color: isPositive ? AppTheme.success : AppTheme.danger,
              size: 20,
            ),
          ),
          const SizedBox(width: AppTheme.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reason,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppTheme.textPrimaryOf(context),
                        fontSize: 14,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space1),
                Text(
                  _formatDate(dateStr),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.mutedOf(context),
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTheme.space3),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isPositive ? '+' : ''}₹${amount.toStringAsFixed(2)}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: isPositive ? AppTheme.success : AppTheme.danger,
                      fontSize: 15,
                    ),
              ),
              if (balanceAfter.isNotEmpty && balanceAfter != '0')
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    'Bal: ₹${(num.tryParse(balanceAfter) ?? 0).toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppTheme.mutedOf(context),
                          fontSize: 10,
                        ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(String raw) {
    if (raw.isEmpty) return '';
    if (raw.contains('T')) {
      final parts = raw.split('T');
      if (parts.isNotEmpty) return parts.first;
    }
    return raw;
  }
}