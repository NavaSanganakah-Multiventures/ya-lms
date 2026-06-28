## 2024-06-28 - Color Swatch Accessibility
**Learning:** Visual-only color swatch buttons (e.g. in the Whiteboard component) must have descriptive `aria-label` and `title` attributes (e.g. "Select Red brush") mapping hex codes to human-readable names. Without these, screen readers announce nothing but "button" and mouse users lack tooltip context.
**Action:** Always map generic data values (like hex colors) to understandable strings when rendering icon-only or purely visual interactive elements.
