import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/responsive.dart';
import '../../widgets/yuva/yuva_icons.dart';
import 'center_nav_item.dart';

class CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final int unreadCount;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.unreadCount = 0,
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
        boxShadow: AppTheme.floatingShadow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radius2Xl),
        child: BottomAppBar(
          color: Colors.transparent,
          elevation: 0,
          height: isMobile(context) ? 70 : (isTablet(context) ? 78 : 86),
          padding: EdgeInsets.zero,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _navItem(context, index: 0, filledIcon: YuvaIcons.home, outlineIcon: YuvaIcons.homeOutline, label: 'Home', selectedColor: selectedColor, unselectedColor: unselectedColor),
              _navItem(context, index: 1, filledIcon: YuvaIcons.library, outlineIcon: YuvaIcons.libraryOutline, label: 'Library', selectedColor: selectedColor, unselectedColor: unselectedColor),
              CenterNavItem(
                isSelected: currentIndex == 2,
                onTap: () => onTap(2),
              ),
              _navItem(
                context,
                index: 3,
                filledIcon: YuvaIcons.wallet,
                outlineIcon: YuvaIcons.walletOutline,
                label: 'Wallet',
                selectedColor: selectedColor,
                unselectedColor: unselectedColor,
                badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : null,
              ),
              _navItem(context, index: 4, filledIcon: YuvaIcons.profile, outlineIcon: YuvaIcons.profileOutline, label: 'Profile', selectedColor: selectedColor, unselectedColor: unselectedColor),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(
    BuildContext context, {
    required int index,
    required IconData filledIcon,
    required IconData outlineIcon,
    required String label,
    required Color selectedColor,
    required Color unselectedColor,
    String? badge,
  }) {
    final isSelected = currentIndex == index;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onTap(index),
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(AppTheme.space1 + 4),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary.withAlphaOpacity(0.1) : Colors.transparent,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    child: Icon(
                      isSelected ? filledIcon : outlineIcon,
                      color: isSelected ? selectedColor : unselectedColor,
                      size: isMobile(context) ? 22 : 26,
                    ),
                  ),
                  if (badge != null)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: const BoxDecoration(
                          gradient: AppTheme.premiumGradient,
                          borderRadius: BorderRadius.all(Radius.circular(999)),
                        ),
                        child: Text(
                          badge,
                          style: const TextStyle(
                            color: AppTheme.surface,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppTheme.space1 + 2),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: isSelected ? selectedColor : unselectedColor,
                      fontSize: 10,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
