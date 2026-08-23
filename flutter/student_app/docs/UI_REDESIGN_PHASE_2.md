## Phase 2 – Login, Navigation & Dashboard Redesign

This phase applies the Yuva design system to the three most visible student screens.

### What changed
- **Login screen** (`lib/screens/login_screen.dart`):
  - Removed dated interactive 3D card.
  - Added animated brand header and feature pills.
  - OTP field now appears with a smooth size/fade transition.
  - Uses `YuvaInput`, `YuvaButton`, and `YuvaCard`.
- **MainLayout** (`lib/screens/main_layout.dart`):
  - Cleaner global app bar with page title, realtime indicator, and notification bell.
  - Replaced old bottom navigation icons with Phosphor icons.
  - Center AI tab is now a glowing orb.
  - Navigation badge now shows wallet/notification counts.
- **Dashboard** (`lib/screens/dashboard_screen.dart`):
  - New greeting header with avatar.
  - `ContinueLearningCard` hero for the most recent enrolled course.
  - `QuickActionsGrid` for AI Doubt, Add Money, Library, and Quizzes.
  - Horizontal `LiveClassCardV2` list for live/upcoming classes.
  - `SubscriptionStatusCard` for plan status.
  - Redesigned `CourseCardV2` list for enrolled and explore courses.
  - Skeleton loading now uses `YuvaShimmerCard`.
- New widgets added under `lib/widgets/yuva/`:
  - `DashboardHeader`, `QuickActionsGrid`, `ContinueLearningCard`
  - `LiveClassCardV2`, `CourseCardV2`, `SubscriptionStatusCard`

### Verification
- `flutter analyze` ✅
- `flutter test` ✅
- CI run #179 ✅

### Next up
Phase 3 will redesign Library/Books, Course Detail, and Wallet screens.