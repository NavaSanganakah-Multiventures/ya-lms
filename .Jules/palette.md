## 2026-05-09 - [Added ARIA Labels to Icon Buttons]
**Learning:** Many icon-only buttons in the admin dashboard (e.g. app/admin/users/page.tsx) were missing screen reader support and tooltips, which makes the app inaccessible for visually impaired users and less intuitive for others.
**Action:** Always add aria-label and title attributes to any icon-only button to ensure semantic accessibility and provide visual hover tooltips.
