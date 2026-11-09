# Events Screens Refactor Plan

Status: Proposed  
Created: 2026-11-09  
Scope: Admin event management and the public guest event calendar

## Outcome

Refactor the events experience into a quiet, responsive calendar that works well on a phone without removing the current event-management capabilities.

The admin screen should make scheduling and updating events fast. The guest screen should make upcoming performances easy to scan and share. Both screens should use the same visual language, date/time formatting, event summaries, and responsive behavior.

## Product direction

- Prefer one clear primary action per screen: `Schedule event` for admin and `View event` for guests.
- Use a compact event list as the phone-first experience. Keep month and week views useful on larger screens without forcing a desktop calendar onto a narrow viewport.
- Keep only the information needed for scanning visible. Move production notes, poster upload, exports, and secondary actions behind a detail view or overflow menu.
- Use the existing Lucide icon set sparingly for navigation and meaning. Do not add decorative emoji to headings, buttons, badges, empty states, or event data.
- Keep the existing burgundy, stone, and white palette, but reduce nested cards, shadows, pill badges, uppercase labels, and repeated “live” treatments.
- Preserve event CRUD, poster upload, realtime updates, ICS export, printing, public sharing, and the existing admin/guest permission split.

## Current findings

### Shared presentation

- `AdminEventsView.tsx:95-277` and `PublicEventCalendarScreen.tsx:85-235` duplicate the page header, date navigation, and view switcher. They have different spacing and actions, which makes the two experiences drift.
- `MonthCalendarGrid.tsx:105-125` forces a `min-w-[640px]` grid and `WeekScheduleView.tsx:65-69` forces a `min-w-[1050px]` week board. On phones this creates horizontal scrolling instead of a responsive layout.
- The same manual date/time formatting is repeated in the page shells and child views. `TodaysEventBanner.tsx:18` and the calendar components use UTC-derived dates, which can show the wrong “today” near the Asia/Manila day boundary.
- Event cards contain poster, title, genre, performer, showtime, sound check, reserved-table, and navigation treatments at once. This is too much information for a phone-sized card.
- The codebase contains multiple `transition-all` usages in these screens. Replace them with explicit transitions and reduced-motion handling during implementation.

### Admin experience

- `AdminEventsView.tsx:227-275` puts Print, Excel, iCal, and Share beside the main calendar controls. This is useful on desktop but becomes a crowded, wrapping toolbar on phones.
- `CreateEditEventModal.tsx:192-269` uses long three-step tab labels and `CreateEditEventModal.tsx:268-560` presents a large form inside a generic centered modal. It needs a full-screen or bottom-sheet treatment on phones.
- `CreateEditEventModal.tsx:101-104` seeds gear and reserved-table notes for a new event. New events should not appear to have logistics data that an admin did not enter.
- `EventDetailModal.tsx:87-300` combines a large hero, full logistics checklist, exports, print, edit, and delete actions. On a phone this should prioritize event essentials and make logistics secondary.
- `ShareCalendarModal.tsx:75-185` presents three equal action cards. Copying the public link should be the primary action; opening, printing, and exporting should be secondary rows.

### Guest experience

- `PublicEventCalendarScreen.tsx:90-140` shows branding, a live-sync badge, Share, Print, and Export `.ICS` before the guest reaches the calendar. Consolidate this into a smaller header and an overflow action menu on phones.
- `PublicEventCalendarScreen.tsx:144-235` repeats the full controls below the header. The phone layout should use one compact navigation row and a clear list/calendar switch.
- `AgendaListView.tsx:49-152` is already the strongest mobile foundation, but it still has a poster-heavy card, multiple logistics chips, and a verbose “Details & Logistics” footer. Reduce it to date, title, performer, time, and one secondary cue.

## Target information architecture

### Shared screen shell

Create shared presentation primitives rather than maintaining separate copies in the admin and public screens:

- `EventCalendarShell`: page background, content width, safe-area padding, loading/error/empty states, and responsive layout.
- `EventCalendarHeader`: title/venue identity and the one primary action slot.
- `EventCalendarControls`: previous/next, Today, current period, and Month/Week/Agenda selection.
- `EventActionMenu`: secondary actions such as Print, ICS, Excel, Share, and Open live view.
- `EventSummaryCard`: the compact event summary used by agenda, phone lists, and “today” highlights.
- `eventFormatters.ts`: local date/time formatting using `Intl.DateTimeFormat`, with Asia/Manila-safe date handling.

The shared components should accept `isAdmin` or explicit action callbacks rather than reading admin state internally. The public screen must remain read-only.

### Phone behavior

At phone widths, optimize for vertical scanning and touch:

- Default to Agenda on the public screen and the admin screen unless the user has explicitly selected another view.
- Render Agenda as a one-column list grouped by date. Each item should expose a 44px-or-larger touch target and open the detail sheet.
- Replace the forced-width month grid with a compact phone month view: date rows or event-count summaries that open the selected date’s events. Do not require horizontal scrolling for the main calendar.
- Replace the forced-width week board with a one-column week list. Keep the seven-day desktop board for larger screens.
- Keep the header to one or two rows. Put secondary actions in an overflow menu or a bottom sheet.
- Use safe-area insets for fixed bottom actions and do not allow sticky controls to cover focused content.
- Avoid hover-only affordances. Every calendar action must work through tap and keyboard interaction.

### Desktop/tablet behavior

- Preserve the month grid, week board, and agenda views at tablet/desktop widths.
- Keep the admin schedule button visible in the header.
- Keep the guest share/print/ICS actions available, but group them visually as secondary actions.
- Allow event cards to show one additional production cue on larger screens, while keeping the mobile summary minimal.

## Admin refactor

1. Simplify `AdminEventsView.tsx` to a compact title, a visible `Schedule event` button, shared controls, and a secondary action menu.
2. Make the action menu responsive:
   - desktop: compact button group or menu;
   - phone: one `More` button opening a bottom sheet with Print, Excel, iCal, and Share.
3. Keep the “today” event callout, but reduce it to one compact summary. If multiple events exist today, show a count and let the user open the agenda instead of silently selecting only the first event.
4. Make `CreateEditEventModal.tsx` a responsive event editor:
   - desktop: centered modal with a short stepper or section navigation;
   - phone: full-height sheet with a sticky header and sticky Save/Cancel footer;
   - General details first; Poster and Production notes as optional sections;
   - clear labels, input types/input modes, inline validation, and focused first error;
   - remove fabricated default gear and reserved-table text;
   - keep poster upload optional and show upload progress without layout jumps.
5. Make `EventDetailModal.tsx` a responsive detail sheet:
   - show title, performer, date, showtime, and status first;
   - make the poster shorter on phones and give images dimensions plus accessible labels;
   - put production notes in a collapsible “Production details” section;
   - keep ICS and Print as secondary actions;
   - keep Edit prominent for admin and place Delete behind an explicit destructive confirmation dialog with an undo/error path where practical.
6. Reduce `ShareCalendarModal.tsx` to a copy-link-first flow. Use a read-only URL field with a labeled copy action, then list Open live view, Print, and Download ICS as secondary actions.

## Guest refactor

1. Simplify `PublicEventCalendarScreen.tsx` to a small venue header, one primary content area, shared controls, and the calendar/list.
2. Remove the prominent “Live Sync Active” badge from the default phone layout. If realtime status is retained, expose it as low-priority status text with an accessible live region only when the status changes.
3. Move Share, Print, and ICS into one compact action menu on phones. Keep Share visible only if testing shows it is a primary guest need.
4. Make Agenda the most useful guest view: date, title, performer, showtime, and a short description preview. Hide backstage gear, reserved-table notes, and sound-check details from the list; retain them in the event detail view only when they are intended for guests.
5. Keep `EventDetailModal` read-only for guests and label the primary action as `Close` or `Add to calendar` depending on the final flow. Do not show admin-only controls.
6. Keep the public event URL stable at `?mode=events`. Consider syncing the selected view and period to query parameters so a shared link can open a specific agenda/month state without changing existing links.

## Content and visual cleanup

- Use sentence case for headings and buttons: `Schedule event`, `Event details`, `Production details`.
- Replace vague actions such as `Next step`, `Details & Logistics`, and `Done` with specific labels where the context is not obvious.
- Remove decorative text blocks that repeat the same information in a badge, heading, and card.
- Use one icon for a functional control, with `aria-hidden="true"` when the adjacent label already explains it. Icon-only controls require an accessible label.
- Do not use emoji as status, category, or decoration. Use text status plus restrained iconography where it improves scanning.
- Replace `...` in user-facing copy with `…` and use `Intl.DateTimeFormat` for dates/times.
- Add truncation/line clamping for long event titles, performer names, genres, and notes without hiding the full value from the detail view.

## Accessibility and interaction requirements

- Use semantic labels for all inputs; include meaningful `name`, `autocomplete`, `type`, and `inputMode` values where supported by the React Native Web layer.
- Ensure all icon-only close, previous, next, and overflow buttons have accessible labels and visible focus states.
- Ensure the modal/sheet traps focus appropriately, supports Escape/back dismissal, and uses `overscroll-behavior: contain` on web.
- Keep touch targets at least 44px, use `touch-action: manipulation`, and provide keyboard alternatives for calendar selection.
- Add `alt`/accessibility text for meaningful posters and mark decorative fallback artwork as hidden from assistive technology.
- Announce save, upload, copy, and realtime status changes through the existing toast/live-region system without over-notifying.
- Honor `prefers-reduced-motion`; replace `transition-all` with explicit properties and avoid scaling cards as the primary hover treatment.
- Preserve browser zoom. Do not use fixed layouts that require horizontal page scrolling on a 320px viewport.

## Implementation sequence

### Phase 1 — Baseline and shared foundations

- Capture screenshots and interaction notes at 320px, 375px, 430px, 768px, and 1440px.
- Confirm the current routing, NativeWind/React Native Web behavior, modal conventions, toast behavior, and available shared primitives.
- Add shared date/time helpers and tests for Asia/Manila date boundaries, missing end times, and long titles.
- Add shared calendar shell, controls, action menu, and event summary interfaces.

### Phase 2 — Responsive calendar views

- Refactor Agenda first and use it as the phone baseline.
- Add phone-specific Month and Week renderers or responsive variants without fixed desktop minimum widths.
- Keep desktop Month and Week layouts, but route both through shared event summaries and action callbacks.
- Add loading, empty, and error states that match the quieter visual system.

### Phase 3 — Guest screen

- Replace the duplicated public header/control markup with the shared shell.
- Implement the phone action menu, compact header, agenda-first default, and read-only detail sheet.
- Verify public links, realtime updates, ICS export, print behavior, and no admin actions.

### Phase 4 — Admin screen and editor

- Replace duplicated admin markup with the shared shell while keeping Schedule event visible.
- Implement responsive admin actions, detail sheet, share flow, and responsive create/edit editor.
- Remove fabricated new-event logistics values and preserve all existing saved fields.
- Add destructive-action confirmation and clear save/upload failure handling.

### Phase 5 — Accessibility, polish, and verification

- Run the Web Interface Guidelines checklist against every changed component.
- Verify no emoji, `transition-all`, hover-only action, unlabeled input, or icon-only control remains in the events feature without an intentional exception.
- Test keyboard, touch, screen-reader labels, reduced motion, browser zoom, safe-area devices, and offline/error states.
- Run typecheck, lint, format check, and the targeted event tests/build.

## Suggested file impact

### Modify

- `frontend/src/features/events/presentation/views/AdminEventsView.tsx`
- `frontend/src/features/events/presentation/screens/PublicEventCalendarScreen.tsx`
- `frontend/src/features/events/presentation/components/MonthCalendarGrid.tsx`
- `frontend/src/features/events/presentation/components/WeekScheduleView.tsx`
- `frontend/src/features/events/presentation/components/AgendaListView.tsx`
- `frontend/src/features/events/presentation/components/TodaysEventBanner.tsx`
- `frontend/src/features/events/presentation/components/EventDetailModal.tsx`
- `frontend/src/features/events/presentation/components/CreateEditEventModal.tsx`
- `frontend/src/features/events/presentation/components/ShareCalendarModal.tsx`
- `frontend/src/features/events/application/useEventStore.ts` only if view defaults/query synchronization or loading state needs adjustment

### Add, if the existing shared UI layer does not already provide equivalents

- `frontend/src/features/events/presentation/components/EventCalendarShell.tsx`
- `frontend/src/features/events/presentation/components/EventCalendarControls.tsx`
- `frontend/src/features/events/presentation/components/EventActionMenu.tsx`
- `frontend/src/features/events/presentation/components/EventSummaryCard.tsx`
- `frontend/src/features/events/presentation/components/EventDetailSheet.tsx` or a responsive replacement for the existing detail modal
- `frontend/src/features/events/presentation/components/EventEditorSheet.tsx` or a responsive replacement for the existing editor modal
- `frontend/src/features/events/presentation/utils/eventFormatters.ts`
- targeted tests under the repository’s existing test convention

Do not change the event database schema or API contract unless implementation uncovers a concrete requirement. The goal is a presentation refactor first.

## Acceptance criteria

- At 320px wide, neither event screen causes horizontal page scrolling; all primary actions remain reachable without zooming.
- On phones, the default event view is a readable one-column agenda/list, and Month/Week remain usable without a 640px/1050px forced board.
- Admin can create, edit, upload a poster, view production details, share the public link, export ICS/Excel, print, and delete with confirmation.
- Guests can browse upcoming events, open read-only details, share the public link, print, and download ICS.
- The public screen never exposes admin controls, fabricated logistics, or internal-only UI.
- New event forms start with empty optional fields rather than invented gear/reservation notes.
- No user-facing event UI uses decorative emoji; icons are purposeful, labeled, and accessible.
- Date/time display remains correct for Asia/Manila, including around midnight and across device time zones.
- Save/upload/copy/realtime failures have actionable feedback, and empty/loading states are intentional.
- The implementation passes typecheck, lint, formatting, targeted tests, and manual responsive checks at phone, tablet, and desktop widths.

## Verification checklist

### Admin

- [ ] Open Events from the admin back office at 320px and 375px.
- [ ] Move month/week periods and return to Today.
- [ ] Create an event with only required fields.
- [ ] Create/edit with a long title, performer, description, and production notes.
- [ ] Upload a poster and verify progress, preview, and failure recovery.
- [ ] Open details, edit, print, export ICS/Excel, share, and delete with confirmation.
- [ ] Confirm realtime insert/update/delete does not duplicate events or leave stale detail content.

### Guest

- [ ] Open `?mode=events` on a phone-sized viewport.
- [ ] Browse agenda, month, and week views without horizontal page overflow.
- [ ] Open details and confirm no admin actions appear.
- [ ] Share/copy the live URL, download ICS, and print.
- [ ] Verify long titles, missing posters, missing end times, no-event periods, and cancelled events.

### Accessibility and quality

- [ ] Keyboard navigation and visible focus work for all controls.
- [ ] Screen-reader labels describe icon-only controls and poster meaning.
- [ ] Modal/sheet focus and dismissal behavior works on web and mobile browser back actions where supported.
- [ ] Reduced motion removes scaling/slide effects that are not necessary.
- [ ] Verify no fixed-width calendar causes page-level horizontal scrolling.
- [ ] Run `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`.
