## 2026-05-09 - [Added ARIA Labels to Icon Buttons]
**Learning:** Many icon-only buttons in the admin dashboard (e.g. app/admin/users/page.tsx) were missing screen reader support and tooltips, which makes the app inaccessible for visually impaired users and less intuitive for others.
**Action:** Always add aria-label and title attributes to any icon-only button to ensure semantic accessibility and provide visual hover tooltips.

## 2026-05-11 - [Missing Accessibility Attributes on Dialog/Modal Actions]
**Learning:** Across various custom floating or modal components (e.g., AIAssistant, AITutor, NotificationPrompt, BuyCreditsModal), icon-only close/dismiss buttons and interactive toggles were consistently missing `aria-label` and `title` attributes. This pattern degrades the accessibility and the discoverability of essential interactions.
**Action:** Always ensure that when implementing custom popups, sidebars, or floating action buttons (FABs), any icon-only interactable elements explicitly receive descriptive `aria-label` and `title` attributes for screen reader support and visual tooltips.
