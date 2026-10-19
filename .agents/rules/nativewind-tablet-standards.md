# NativeWind v4 & Tablet-First POS Standards

> **Scope:** Applies to all frontend components, screens, modals, cards, and UI additions or modifications in `@monks/frontend`.
> **Primary Rule:** All future views and UI modifications must utilize **NativeWind v4** utility classes with a **Tablet-First, Responsive** approach and a **strict minimum font size of 16px**.

---

## 1. 🛡️ Preservation of Existing Views (Zero Regressions)

- **Do NOT convert existing files:** Never refactor, rewrite, or delete existing `StyleSheet.create` declarations or companion `*.styles.ts` files in already-built views. Existing layouts are production-critical and must remain intact.
- **Isolated Hybrid Rule for Modifications:** When modifying or adding new UI elements inside an existing component that uses `StyleSheet.create`:
  - Keep all existing styles, layouts, and style references untouched.
  - Apply NativeWind utility classes (`className="..."`) only to the newly added JSX elements or newly introduced subcomponents.
  - Never attempt a whole-file conversion from `StyleSheet` to NativeWind.

---

## 2. ⚡ New Views & Future Components

- **100% NativeWind v4:** All newly created views, modals, cards, drawers, and UI components must use NativeWind utility classes (`className="..."`).
- **No New StyleSheets:** Do not create new `*.styles.ts` files or new `StyleSheet.create` calls for new views.
- **Component Purity:** Strictly use React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`). Web DOM elements (`<div>`, `<span>`, `<button>`, `<input>`) are forbidden.

---

## 3. 🔍 Strict Minimum Font Size Floor (≥ 16px)

POS tablets are operated at arm's length by cashiers, waitstaff, and bartenders under fast-paced ambient bar lighting. Readability is paramount.

- **Universal 16px Floor:** **EVERY** text element—including body copy, button labels, input text, placeholder text, status badges, tags, chips, and timestamps—must be **at least 16px** (`text-base` or `text-pos-base`).
- **Forbidden Classes:**
  - ❌ `text-xs` (12px)
  - ❌ `text-sm` (14px)
  - ❌ `text-pos-xs` (14px)
  - ❌ `text-pos-sm` (15px)
  - ❌ Inline styles with `fontSize < 16`
- **Approved Typography Scale:**
  - `text-base` / `text-pos-base`: **16px** (Standard body, badges, timestamps, helper labels)
  - `text-pos-md`: **18px** (Subheadings, table numbers, card titles, secondary buttons)
  - `text-pos-lg`: **20px** (Primary button labels, section headers, key pricing)
  - `text-pos-xl`: **24px** (Order totals, drawer balance, modal titles)
  - `text-pos-2xl`: **28px** (Hero metrics, station header titles)
  - `text-pos-3xl`: **36px** (Large totals, PIN code display)

---

## 4. 📱 Tablet-First & Touch Targets (≥ 48px)

- **Mandatory Touch Targets:** Every interactive element (`Pressable`, button, card, tab, keypad key, chip, icon button) must have a minimum touch dimension of **48px**:
  - `min-h-[48px] min-w-[48px]` or `min-h-touch-md min-w-touch-md`
  - Include generous hit slop where applicable (`hitSlop={8}`)
- **Spacious Layouts:** Use adequate spacing between interactive controls (`gap-3`, `gap-4`, `p-3`, `p-4`) to eliminate accidental miss-taps.

---

## 5. 📐 Responsive Breakpoints

The system is designed tablet-first (primary target: 1024x768 and 1180px POS stations) but must adapt gracefully to all screen sizes:

- **Mobile (< 768px):** Single-column stacked layout, full-width inputs, bottom-sheet style dialogs.
- **Tablet (≥ 768px / `tablet:`):** 2–3 column grids, touch-friendly split cards, comfortable modal dialogs.
- **Large POS Displays (≥ 1024px / 1180px / `tablet-lg:` & `pos:`):** Split-pane master-detail views, persistent sidebars, fast-action command bars.

Example:

```tsx
<View className="flex-col tablet:flex-row gap-4 w-full">
  <View className="w-full tablet:w-1/2 p-4 min-h-[48px]">{/* Tablet-responsive content */}</View>
</View>
```

---

## 6. 📝 Reference Implementation Patterns

### Pattern A: Creating a Brand New View (Pure NativeWind)

```tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';

export function OrderSummaryCard({ orderId, total, onAction }: Props) {
  return (
    <View className="bg-jazz-900 border border-jazz-700 rounded-xl p-4 gap-3 w-full">
      <View className="flex-row items-center justify-between">
        <Text className="text-pos-lg font-bold text-jazz-gold">Order #{orderId}</Text>
        <View className="bg-jazz-800 px-3 py-1.5 rounded-full min-h-[48px] justify-center items-center">
          <Text className="text-base text-white font-medium">Pending</Text>
        </View>
      </View>

      <Text className="text-pos-xl font-bold text-white">₱{total.toFixed(2)}</Text>

      <Pressable
        onPress={onAction}
        className="bg-jazz-gold min-h-[48px] rounded-lg justify-center items-center active:opacity-80"
      >
        <Text className="text-pos-base font-semibold text-jazz-950">Confirm Order</Text>
      </Pressable>
    </View>
  );
}
```

### Pattern B: Adding a Feature to an Existing View (Isolated Hybrid)

```tsx
// Existing component has legacy styles intact
import { styles } from './LegacyScreen.styles';

export function LegacyScreen() {
  return (
    <View style={styles.container}>
      {/* Existing legacy elements stay untouched */}
      <Text style={styles.legacyHeader}>Original Title</Text>

      {/* NEWLY ADDED ELEMENT: Styled cleanly with NativeWind */}
      <View className="mt-4 p-4 bg-jazz-850 rounded-xl border border-jazz-700 gap-3">
        <Text className="text-base font-semibold text-white">New Tablet Feature</Text>
        <Pressable
          onPress={() => {}}
          className="bg-jazz-gold min-h-[48px] rounded-lg justify-center items-center"
        >
          <Text className="text-base font-bold text-jazz-950">Tablet Action</Text>
        </Pressable>
      </View>
    </View>
  );
}
```
