## Phase 3 – Library, Course Detail & Wallet Redesign

This phase applies the Yuva design system to three key content/monetization screens.

### What changed
- **Library / Books** (`lib/screens/books_screen.dart`):
  - Added search bar with live filtering.
  - Added Free / Paid category filter chips.
  - Replaced book cards with new `BookCard` widget.
  - Empty/error states use `YuvaEmptyState`.
  - Loading skeletons use `YuvaShimmerCard`.
- **Course Detail** (`lib/screens/course_detail_screen.dart`):
  - New gradient hero header with course image, title, description and stats pills.
  - Premium access card with `YuvaButton.primary` Buy Now.
  - Live classes shown in horizontal `LiveClassCardV2` list.
  - Lessons list redesigned with `LessonTileV2` (type badge, lock icon, completed check).
  - Preserved all lesson-type handling (video, live, quiz, audio, pdf).
- **Wallet** (`lib/screens/wallet_screen.dart`):
  - New gradient `BalanceCard` header.
  - Segmented tab bar: Recharge / Packs / History.
  - Recharge tab with quick amount chips, custom amount input, and summary card.
  - Packs tab using `CreditPackCard`.
  - History tab using `TransactionRow` timeline.
- New widgets added under `lib/widgets/yuva/`:
  - `BookCard`, `LessonTileV2`, `CreditPackCard`, `TransactionRow`, `BalanceCard`

### Verification
- `flutter analyze` ✅
- `flutter test` ✅
- CI run #189 ✅

### Next up
Phase 4 will redesign Yagya Mitra AI chat, and Phase 5 will polish Profile + Quiz + Subscription + Checkout.