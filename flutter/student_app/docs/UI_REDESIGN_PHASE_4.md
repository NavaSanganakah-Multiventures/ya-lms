## Phase 4 – Yagya Mitra AI Chat Redesign

Redesigned the AI study assistant (`lib/screens/yagya_mitra_screen.dart`) with a modern, chat-first interface.

### What changed
- New header with AI assistant branding and model selector dropdown.
- Message bubbles redesigned:
  - User messages use the premium gradient.
  - AI messages use a rounded surface card.
  - Markdown rendering remains supported.
- Animated loading bubble using `ChatBubble.isLoading`.
- Input area uses `YuvaInput` with send action.
- All API logic, error handling, and AI model selection preserved.

### New widget
- `lib/widgets/yuva/chat_bubble.dart`

### Verification
- `flutter analyze` ✅
- `flutter test` ✅