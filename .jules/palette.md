## 2025-02-23 - Added Keyboard Accessibility to Content AI Tool
**Learning:** Interactive floating panels and dropdown menus often miss focus-visible outlines, making them inaccessible to keyboard users navigating through complex components.
**Action:** Always apply `focus-visible:outline-none focus-visible:ring-2` to custom UI components like AI suggestion buttons and ensure toggle buttons correctly reflect their state with `aria-expanded`.
