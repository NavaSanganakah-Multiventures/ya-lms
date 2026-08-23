## Phase 5 – Profile, Quiz, Subscription & Checkout Polish

Final polish phase covering account, assessment, monetization, and purchase flows.

### What changed
- **Profile** (`profile_screen.dart`):
  - Hero banner with gradient background, avatar, name, and email.
  - Grouped action tiles: Account, Preferences, Payments.
  - Themed logout button.
- **Quiz List** (`quiz_list_screen.dart`):
  - Replaced default list with `QuizCard` items showing duration, marks, and question count.
  - Loading skeletons and empty/error states with `YuvaEmptyState`.
- **Quiz Active** (`quiz_active_screen.dart`):
  - New question card design with option tiles.
  - Timer and answered count in app bar.
  - Bottom submit bar with `YuvaButton`.
- **Subscription** (`subscription_screen.dart`):
  - Gradient current subscription card.
  - Redesigned plan cards using `SubscriptionPlanCard`.
  - Section header and empty state handling.
- **Checkout** (`checkout_screen.dart`):
  - Cleaner order summary card with gradient icon.
  - Expandable billing address with inline validation.
  - Coupon and price summary using `YuvaCard`.
  - Payment CTA uses `YuvaButton.primary`.

### New widgets
- `lib/widgets/yuva/quiz_card.dart`
- `lib/widgets/yuva/subscription_plan_card.dart`

### Verification
- `flutter analyze` ✅
- `flutter test` ✅