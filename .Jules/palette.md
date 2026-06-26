## 2025-05-12 - Icon-Only Buttons Accessibility

**Learning:** When encountering `lucide-react` icons wrapped in `<button>` tags without any text, screen readers fail to describe the action, and sighted users might be confused if the icon is ambiguous. Adding `aria-label` (for screen readers) and `title` (for mouse hover tooltips) solves both accessibility and usability issues in one stroke.

**Action:** Whenever I encounter icon-only buttons, I will ensure they possess descriptive and dynamically updating `aria-label` and `title` attributes (e.g., `aria-label={isPlaying ? "Pause" : "Play"}`).
## 2025-05-14 - Icon-only buttons accessibility
**Learning:** Icon-only buttons are widespread throughout the admin dashboards (e.g. edit, delete, refresh). They look visually clean but cause issues for screen-readers and can be ambiguous without tooltips. This is a common pattern to address.
**Action:** Always add aria-label and title attributes to icon-only buttons for both a11y and tooltip functionality.
## 2025-05-14 - Scoping side effects when solving UX tasks
**Learning:** Fixing one issue with an unrelated or out of scope refactor in code (e.g. changing component loading state while fixing an accessibility error) can inadvertently create bugs that contradict my persona's mission. I should avoid backend/logic changes while adding minor UX modifications.
**Action:** Do not refactor React component loading state management while adding ARIA labels. Keep changes scoped exclusively to what was asked.
## 2026-05-25 - [Added ARIA Labels to AdminAI]
**Learning:** Icon-only buttons for critical actions (New Chat, Clear, Close, Send) in internal tools often lack screen reader labels.
**Action:** Always add `aria-label` alongside `title` to icon-only buttons to ensure both screen reader support and hover tooltips.

## 2024-05-28 - Keyboard Inaccessible Table Actions
**Learning:** Using `opacity-0 group-hover:opacity-100` on table actions hides them from keyboard users who tab through the interface, breaking keyboard navigation flow.
**Action:** Always combine `group-hover:opacity-100` with `focus-within:opacity-100` on the container so that actions become visible when a user tabs into any element within that container. Also ensure action buttons have `focus-visible` styles.
## 2024-11-20 - [Accessibility Enhancements for LanguageSwitcher]
**Learning:** Adding ARIA roles and proper focus visibility to custom interactive UI elements significantly improves both screen reader interpretation and keyboard user navigation, ensuring an inclusive experience without compromising aesthetics.
**Action:** Always include keyboard support (like the Escape key pattern) and semantic roles (`menu`, `menuitem`, `aria-haspopup`) when building custom drop-down or fly-out components. Use Tailwind's `focus-visible` utility to provide clear visual cues for keyboard navigation without affecting mouse users.
## 2026-06-26 - [Added ARIA Labels to Back Button in Course Learn Page]
**Learning:** Icon-only navigation buttons, like the `ArrowLeft` used for returning from a lesson, often lack accessible names. This makes them invisible or confusing to screen reader users and missing helpful tooltips for sighted users.
**Action:** Consistently apply `aria-label` and `title` attributes to icon-only back/navigation buttons across the dashboard and learning views.
