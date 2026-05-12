## 2025-05-12 - Icon-Only Buttons Accessibility

**Learning:** When encountering `lucide-react` icons wrapped in `<button>` tags without any text, screen readers fail to describe the action, and sighted users might be confused if the icon is ambiguous. Adding `aria-label` (for screen readers) and `title` (for mouse hover tooltips) solves both accessibility and usability issues in one stroke.

**Action:** Whenever I encounter icon-only buttons, I will ensure they possess descriptive and dynamically updating `aria-label` and `title` attributes (e.g., `aria-label={isPlaying ? "Pause" : "Play"}`).
