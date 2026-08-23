import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

/// Centralised icon helper so the whole app can switch icon families easily.
///
/// For now we use Phosphor icons everywhere; if a platform or design calls
/// for Lucide, only this file needs to change.
class YuvaIcons {
  static IconData get home => PhosphorIcons.house(PhosphorIconsStyle.fill);
  static IconData get homeOutline => PhosphorIcons.house(PhosphorIconsStyle.regular);
  static IconData get library => PhosphorIcons.books(PhosphorIconsStyle.fill);
  static IconData get libraryOutline => PhosphorIcons.books(PhosphorIconsStyle.regular);
  static IconData get wallet => PhosphorIcons.wallet(PhosphorIconsStyle.fill);
  static IconData get walletOutline => PhosphorIcons.wallet(PhosphorIconsStyle.regular);
  static IconData get profile => PhosphorIcons.user(PhosphorIconsStyle.fill);
  static IconData get profileOutline => PhosphorIcons.user(PhosphorIconsStyle.regular);
  static IconData get ai => PhosphorIcons.sparkle(PhosphorIconsStyle.fill);
  static IconData get aiOutline => PhosphorIcons.sparkle(PhosphorIconsStyle.regular);

  static IconData get search => PhosphorIcons.magnifyingGlass(PhosphorIconsStyle.regular);
  static IconData get notification => PhosphorIcons.bell(PhosphorIconsStyle.regular);
  static IconData get settings => PhosphorIcons.gear(PhosphorIconsStyle.regular);
  static IconData get logout => PhosphorIcons.signOut(PhosphorIconsStyle.regular);
  static IconData get play => PhosphorIcons.playCircle(PhosphorIconsStyle.fill);
  static IconData get check => PhosphorIcons.checkCircle(PhosphorIconsStyle.fill);
  static IconData get lock => PhosphorIcons.lockKey(PhosphorIconsStyle.fill);
  static IconData get bookOpen => PhosphorIcons.bookOpen(PhosphorIconsStyle.regular);
  static IconData get video => PhosphorIcons.video(PhosphorIconsStyle.regular);
  static IconData get pdf => PhosphorIcons.fileText(PhosphorIconsStyle.regular);
  static IconData get quiz => PhosphorIcons.clipboardText(PhosphorIconsStyle.regular);
  static IconData get live => PhosphorIcons.broadcast(PhosphorIconsStyle.regular);
  static IconData get arrowRight => PhosphorIcons.caretRight(PhosphorIconsStyle.regular);
  static IconData get arrowLeft => PhosphorIcons.caretLeft(PhosphorIconsStyle.regular);
  static IconData get arrowDown => PhosphorIcons.caretDown(PhosphorIconsStyle.regular);
  static IconData get more => PhosphorIcons.dotsThree(PhosphorIconsStyle.regular);
  static IconData get close => PhosphorIcons.x(PhosphorIconsStyle.regular);
  static IconData get filter => PhosphorIcons.slidersHorizontal(PhosphorIconsStyle.regular);
}
