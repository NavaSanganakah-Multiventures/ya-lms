import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/responsive.dart';
import 'center_nav_item.dart';

class CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = AppTheme.surfaceOf(context);
    final selectedColor = AppTheme.primary;
    final unselectedColor = AppTheme.mutedOf(context);

    return Container(
      margin: EdgeInsets.symmetric(
        horizontal: isMobile(context) ? 12 : 24,
        vertical: isMobile(context) ? 10 : 14,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTheme.radius2Xl),
        border: Border.all(
          color: AppTheme.borderOf(context).withAlphaOpacity(0.6),
          width: 1,
        ),
        boxShadow: AppTheme.mediumShadow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radius2Xl),
        child: BottomAppBar(
          color: Colors.transparent,
          elevation: 0,
          height: isMobile(context) ? 64 : (isTablet(context) ? 72 : 80),
          padding: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _navItem(context, index: 0, icon: Icons.dashboard_rounded, label: 'Home', selectedColor: selectedColor, unselectedColor: unselectedColor),
              _navItem(context, index: 1, icon: Icons.library_books_rounded, label: 'Library', selectedColor: selectedColor, unselectedColor: unselectedColor),
              CenterNavItem(onTap: () => onTap(2)),
              _navItem(context, index: 3, icon: Icons.account_balance_wallet_rounded, label: 'Wallet', selectedColor: selectedColor, unselectedColor: unselectedColor),
              _navItem(context, index: 4, icon: Icons.account_circle_rounded, label: 'Profile', selectedColor: selectedColor, unselectedColor: unselectedColor),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(
    BuildContext context, {
    required int index,
    required IconData icon,
    required String label,
    required Color selectedColor,
    required Color unselectedColor,
  }) {
    final isSelected = currentIndex == index;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onTap(index),
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            padding: const EdgeInsets.symmetric(vertical: AppTheme.space2),
            decoration: BoxDecoration(
              color: isSelected ? selectedColor.withAlphaOpacity(0.08) : Colors.transparent,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedScale(
                  scale: isSelected ? 1.1 : 1.0,
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOut,
                  child: Icon(
                    icon,
                    size: isMobile(context) ? 22 : 24,
                    color: isSelected ? selectedColor : unselectedColor,
                  ),
                ),
                const SizedBox(height: AppTheme.space1),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: isMobile(context) ? 10 : 12,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? selectedColor : unselectedColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
