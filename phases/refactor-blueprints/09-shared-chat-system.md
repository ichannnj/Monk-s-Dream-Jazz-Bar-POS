# Blueprint 09: Shared Chat System Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/chat/presentation/SharedChatView.tsx` (1,073 LOC)
  - `frontend/src/features/chat/application/useChatStore.ts` (793 LOC)
  - `frontend/src/features/chat/data/chat.api.ts` (552 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/chat/data/chatFormatters.ts` (`~140 LOC`)
   - `formatRelativeElapsed`, `formatFriendlyTimestamp`, message row data mappers.
2. `frontend/src/features/chat/data/chatDmAndRoster.api.ts` (`~220 LOC`)
   - Staff roster fetch, 1-on-1 DM room resolution, mark-as-read mutations.
3. `frontend/src/features/chat/data/chat.api.ts` (`~210 LOC` Facade)
   - Message fetch, send, attachment handling, and unified re-exports.
4. `frontend/src/features/chat/application/chatStore.types.ts` (`~135 LOC`)
   - State and action interfaces for Zustand chat store.
5. `frontend/src/features/chat/application/chatChannelHelpers.ts` (`~235 LOC`)
   - Role-isolated station channel filtering (`#foh`, `#bar`, `#cafe`, `#kitchen`), DM room grouping.
6. `frontend/src/features/chat/application/chatRealtimeActions.ts` (`~220 LOC`)
   - Realtime message handling, optimistic deduplication, presence sync.
7. `frontend/src/features/chat/application/useChatStore.ts` (`~230 LOC` Facade)
   - Zustand store setup delegating actions to helpers.
8. `frontend/src/features/chat/presentation/hooks/useSharedChatController.ts` (`~220 LOC`)
   - Mobile master-detail layout toggle, scroll tracking, message submit, DM modal state.
9. `frontend/src/features/chat/presentation/components/ChatConversationSidebar.tsx` (`~265 LOC`)
   - Station channels list, direct messages list, unread indicators, new DM modal.
10. `frontend/src/features/chat/presentation/components/ChatMessageThread.tsx` (`~275 LOC`)
    - Message list, date separators, author badges, scroll-to-bottom FAB.
11. `frontend/src/features/chat/presentation/components/ChatComposerBar.tsx` (`~210 LOC`)
    - Quick preset chips (`≥48px`), text composer, urgent alert toggle.
12. `frontend/src/features/chat/presentation/SharedChatView.tsx` (`~160 LOC` View Shell)
    - Responsive layout shell coordinating sidebar, thread, and composer.

## Execution Steps

1. Decompose `chat.api.ts` into formatters and DM/roster sub-modules.
2. Decompose `useChatStore.ts` into store types, channel helpers, and realtime actions.
3. Extract chat view sub-components and hook.
4. Refactor `SharedChatView.tsx` to under 200 LOC.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/chat/presentation/SharedChatView.tsx \
     frontend/src/features/chat/presentation/hooks/* \
     frontend/src/features/chat/presentation/components/* \
     frontend/src/features/chat/application/*.ts \
     frontend/src/features/chat/data/*.ts
pnpm sync:knowledge
```
