# Bagalytics Responsive Design Plan

## Overview
Make the desktop-first Bagalytics dashboard responsive for tablet (768px) and mobile (< 640px) screens.

**Current State:** 13 responsive classes total using only `sm:` and `lg:` prefixes. No `md:` breakpoint coverage.

**Target Breakpoints (Tailwind defaults):**
- Mobile: < 640px (base styles)
- Small tablet: `sm:` ≥ 640px
- Tablet: `md:` ≥ 768px
- Desktop: `lg:` ≥ 1024px

---

## Phase 1: Header Responsiveness (Lines 188-250)

**Problem:** Header has social links + search input + button in a row. Search input is fixed `w-80` (320px).

**Changes to `src/app/page.tsx`:**

1. **Search input (line 244):** Change `w-80` → `w-full sm:w-64 md:w-80`
2. **Header right section (line 200):** Add responsive stacking:
   - Change `flex items-center gap-3` → `flex flex-col sm:flex-row items-stretch sm:items-center gap-3`
3. **Social links container (line 202):** Hide individual links on mobile, keep GitHub:
   - Add `hidden sm:flex` to X and Discord links
   - Keep GitHub visible always
4. **Search + button container (line 243):** Make full width on mobile:
   - Add `w-full sm:w-auto` to container div

**Verification:** Resize browser to < 640px. Search should be full-width, social links reduced.

---

## Phase 2: Token Details Card (Lines 265-321)

**Problem:** Token image + info + 4 purchase links in a horizontal row. Will overflow on mobile.

**Changes:**

1. **Card top row (line 267):** Stack vertically on mobile:
   - Change `flex items-center justify-between` → `flex flex-col gap-4 md:flex-row md:items-center md:justify-between`

2. **Purchase links container (line 301):** Wrap and center on mobile:
   - Change `flex items-center gap-3` → `flex flex-wrap justify-center md:justify-end gap-2 md:gap-3`

3. **Purchase link buttons (lines 302-317):** Reduce padding on mobile:
   - Add `text-xs md:text-sm` and `px-2 py-1 md:px-3 md:py-1.5` to each link

**Verification:** Card should stack with token info above, links below on mobile.

---

## Phase 3: Fee Stats Header (Lines 326-346)

**Problem:** Large 5xl text for Lifetime and 24h fees side by side.

**Changes:**

1. **Container (line 327):** Stack on mobile:
   - Change `flex items-end justify-between` → `flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between`

2. **Lifetime fees text (line 331):** Reduce size on mobile:
   - Change `text-5xl` → `text-3xl sm:text-4xl md:text-5xl`

3. **24h fees text (line 338):** Same treatment:
   - Change `text-5xl` → `text-3xl sm:text-4xl md:text-5xl`

4. **Right section (line 336):** Center on mobile:
   - Change `text-right` → `text-center sm:text-right`

5. **Container negative margin (line 326):** Reduce on mobile:
   - Change `-mb-16` → `-mb-8 sm:-mb-12 md:-mb-16`

**Verification:** Fee stats should center-stack on mobile with smaller text.

---

## Phase 4: Metrics Row Below Chart (Lines 403-471)

**Problem:** Left metrics (Market Cap, Price, etc.) + Right badges in a row. Will overflow.

**Changes:**

1. **Main flex container (line 406):** Stack on mobile:
   - Change `flex items-end justify-between` → `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`

2. **Left metrics container (line 408):** Wrap on mobile:
   - Change `flex items-end gap-8` → `grid grid-cols-2 gap-4 sm:flex sm:items-end sm:gap-8`

3. **Price change badges container (line 438):** Allow wrapping:
   - Change `flex gap-2` → `flex flex-wrap gap-2 justify-center sm:justify-end`

**Verification:** Metrics should show in 2-column grid on mobile, badges wrap below.

---

## Phase 5: Fee Projections Grid (Lines 489-549)

**Problem:** Two 5-column grids for projections and trading stats.

**Changes:**

1. **Projections grid (line 489):**
   - Change `grid grid-cols-5 gap-6` → `grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-6`

2. **Projection values (lines 492, 499, 507, 511, 515):** Reduce text size on mobile:
   - Change `text-2xl` → `text-xl sm:text-2xl`

3. **Trading stats grid (line 520):**
   - Change `grid grid-cols-5 gap-6` → `grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-6`

**Verification:** Grids should show 2 columns on mobile, 3 on tablet, 5 on desktop.

---

## Phase 6: Token Creators Section (Lines 557-596)

**Problem:** Creator cards have `min-w-[280px]` which may overflow on small screens.

**Changes:**

1. **Creator cards container (line 561):**
   - Keep `flex gap-4 flex-wrap justify-center` (already good)

2. **Individual creator card (line 569):**
   - Change `min-w-[280px]` → `w-full sm:w-auto sm:min-w-[280px] max-w-[400px]`

3. **Creator card inner layout:** Already good with flex, will adapt naturally.

**Verification:** Creator cards should be full-width on mobile, side-by-side on larger screens.

---

## Phase 7: Token Ticker Component

**File:** `src/components/TokenTicker.tsx`

**Check if responsive patterns are needed.** The ticker scrolls horizontally which should work on all screens, but verify item sizing.

**Changes (if needed):**
- Reduce token item padding/font size on mobile
- Add responsive classes to token images if too large

---

## Phase 8: Chart Responsiveness (Lines 350-401)

**Already has:** `h-64 sm:h-80` - good base responsive height.

**Additional changes:**

1. **Edge fade overlays (lines 353-354):** Reduce width on mobile:
   - Change `w-24` → `w-12 sm:w-24` for both left and right gradients

2. **Chart labels in dot render (lines 377-378):** These are SVG hardcoded values. Consider:
   - Making label box smaller or hiding labels on mobile (this may be complex)
   - For now, leave as-is since Recharts ResponsiveContainer handles scaling

**Verification:** Chart should be shorter on mobile, gradient fades smaller.

---

## Implementation Order

1. **Phase 1: Header** - Most visible, quick win
2. **Phase 3: Fee Stats Header** - High impact visually
3. **Phase 4: Metrics Row** - Likely to break first on tablet
4. **Phase 5: Projections Grid** - Major layout change
5. **Phase 2: Token Details Card** - Important but complex
6. **Phase 6: Creators** - Simple fix
7. **Phase 8: Chart** - Minor tweaks
8. **Phase 7: Ticker** - Verify only

---

## Testing Checklist

After each phase, verify at these widths:
- [ ] 375px (iPhone SE)
- [ ] 390px (iPhone 14)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape / small desktop)
- [ ] 1280px+ (desktop - should look unchanged)

**Key interactions to test:**
- [ ] Search input accepts text on mobile
- [ ] Refresh button works
- [ ] Purchase links are tappable
- [ ] Chart tooltip appears correctly
- [ ] Ticker scrolling works on touch

---

## Files Modified

- `src/app/page.tsx` - All layout changes
- `src/components/TokenTicker.tsx` - Potential minor adjustments

## No New Files Needed

All changes are Tailwind class modifications to existing elements.
