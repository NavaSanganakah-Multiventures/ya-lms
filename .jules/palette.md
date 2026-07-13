
## 2024-07-13 - [Semantic Buttons for Interactive Lists]
**Learning:** Found that custom lists (like notifications) often use clickable `div` elements instead of semantic buttons. This breaks accessibility for screen readers and keyboard navigation.
**Action:** When making custom list items interactive, use semantic `<button type="button">` with `w-full text-left` classes and `focus-visible:outline-none focus-visible:ring-2` to ensure proper behavior and focus indication without disrupting layout.
