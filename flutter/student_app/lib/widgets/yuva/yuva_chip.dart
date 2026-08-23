import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Selectable pill chip used for categories, filters and quick actions.
class YuvaChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback? onTap;
  final IconData? icon;

  const YuvaChip({
    super.key,
    required this.label,
    this.isSelected = false,
    this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isSelected ? AppTheme.primary : AppTheme.surfaceOf(context);
    final fg = isSelected ? AppTheme.surface : AppTheme.textSecondaryOf(context);
    final borderColor = isSelected ? AppTheme.primary : AppTheme.borderOf(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusFull),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4, vertical: AppTheme.space2 + 2),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: isSelected ? AppTheme.softShadow : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: fg),
                const SizedBox(width: AppTheme.space1 + 2),
              ],
              Text(
                label,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: fg,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Row of selectable chips with the first “All” option.
class YuvaChipFilter extends StatelessWidget {
  final List<String> categories;
  final String? selected;
  final ValueChanged<String?> onSelected;
  final String allLabel;

  const YuvaChipFilter({
    super.key,
    required this.categories,
    required this.selected,
    required this.onSelected,
    this.allLabel = 'All',
  });

  @override
  Widget build(BuildContext context) {
    final items = [allLabel, ...categories];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.space4),
      child: Row(
        children: items.map((label) {
          final isAll = label == allLabel;
          final isSelected = (isAll && (selected == null || selected == allLabel)) || label == selected;
          return Padding(
            padding: const EdgeInsets.only(right: AppTheme.space2 + 4),
            child: YuvaChip(
              label: label,
              isSelected: isSelected,
              onTap: () => onSelected(isAll ? null : label),
            ),
          );
        }).toList(),
      ),
    );
  }
}
