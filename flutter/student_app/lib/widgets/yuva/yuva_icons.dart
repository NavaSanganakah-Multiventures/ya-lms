import 'package:flutter/material.dart';

/// Centralised icon helper so the whole app can switch icon families easily.
///
/// Using Material Icons for maximum Flutter compat and fewer package risks.
/// We intentionally mirror the Phosphor set names used by the Yuva design.
class YuvaIcons {
  static IconData get home => Icons.home_rounded;
  static IconData get homeOutline => Icons.home_outlined;
  static IconData get library => Icons.library_books_rounded;
  static IconData get libraryOutline => Icons.library_books_outlined;
  static IconData get wallet => Icons.account_balance_wallet_rounded;
  static IconData get walletOutline => Icons.account_balance_wallet_outlined;
  static IconData get profile => Icons.person_rounded;
  static IconData get profileOutline => Icons.person_outlined;
  static IconData get ai => Icons.auto_awesome_rounded;
  static IconData get aiOutline => Icons.auto_awesome_outlined;

  static IconData get search => Icons.search_rounded;
  static IconData get notification => Icons.notifications_rounded;
  static IconData get settings => Icons.settings_rounded;
  static IconData get logout => Icons.logout_rounded;
  static IconData get play => Icons.play_circle_fill_rounded;
  static IconData get playOutline => Icons.play_circle_outline_rounded;
  static IconData get check => Icons.check_circle_rounded;
  static IconData get checkOutline => Icons.check_circle_outlined;
  static IconData get lock => Icons.lock_rounded;
  static IconData get bookOpen => Icons.menu_book_rounded;
  static IconData get video => Icons.play_arrow_rounded;
  static IconData get pdf => Icons.picture_as_pdf_rounded;
  static IconData get quiz => Icons.quiz_rounded;
  static IconData get live => Icons.live_tv_rounded;
  static IconData get arrowRight => Icons.chevron_right_rounded;
  static IconData get arrowLeft => Icons.chevron_left_rounded;
  static IconData get arrowDown => Icons.keyboard_arrow_down_rounded;
  static IconData get more => Icons.more_horiz_rounded;
  static IconData get close => Icons.close_rounded;
  static IconData get filter => Icons.tune_rounded;
}