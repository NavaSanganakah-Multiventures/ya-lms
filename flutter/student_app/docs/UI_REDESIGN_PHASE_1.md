## Phase 1 – Yuva UI Foundation

This branch lays the design-system groundwork for the full student app visual refresh.

### What changed
- Updated `pubspec.yaml` with Yuva dependencies.
- Rewrote `lib/theme/app_theme.dart` with a new color palette, typography and component themes.
- Added shared widgets under `lib/widgets/yuva/`:
  - `YuvaButton` (primary gradient, secondary, outline, ghost)
  - `YuvaCard` (modern surface card)
  - `YuvaInput` (clean text field)
  - `YuvaChip` / `YuvaChipFilter`
  - `YuvaEmptyState`, `YuvaShimmer`
  - `AiAssistantPill`
  - `SectionHeader`
  - `YuvaIcons` (Phosphor icon family)

### Next up
Phase 2 will redesign Login, MainLayout, and Dashboard using these new components.
