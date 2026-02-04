# DevKarma — UI Professionalization & Design System Overhaul Plan

## Overview

DevKarma is an **on-chain reputation scoring platform for Solana token creators** (score: 0-740). The current UI suffers from visual inconsistencies, typography chaos, and alignment issues that undermine the professional, "protocol-grade" aesthetic the product requires. 

This plan addresses the user's comprehensive critique: stripping back the "gaming portfolio" aesthetic and implementing a clean, structured design system that emphasizes **hierarchy, readability, and trust**.

---

## 1. Typography System Refactor

### Current Problems
- [x] Audit: Three competing fonts (Permanent Marker, DM Sans, JetBrains Mono) all used prominently
- [x] Marker font overused for stats, scores, labels — reduces readability
- [x] `font-display-mock` class applied too broadly (stats, tier names, token names)
- [x] Score numbers (538, #5) use "fun" fonts instead of clean data typography

### Tasks

- [x] **Establish strict typography hierarchy**
  - Marker font (`--font-marker`): USERNAME ONLY (display names, hero headlines)
  - DM Sans (`--font-dm-sans`): All body text, labels, descriptions, button text
  - JetBrains Mono (`--font-jetbrains`): Wallet addresses, code snippets, token mints ONLY
  
- [x] **Refactor score display typography**
  - [x] Replace `font-display-mock` on score numbers with `font-stat` for clean numerical readability
  - [x] Update [profile/\[handle\]/page.tsx](app/(public)/profile/[handle]/page.tsx) stats grid:
    - DevCred Score: Use `font-stat text-4xl` instead of marker
    - Rank: Same treatment
    - Launches: Same treatment
    - Tier name: Now uses `font-bold uppercase tracking-wide` (NOT marker font)
  
- [x] **Update global typography utilities in [globals.css](app/globals.css)**
  ```css
  /* Data/stats typography - clean numerical display */
  .font-stat {
    font-family: var(--font-dm-sans), system-ui, sans-serif;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }
  
  /* Display heading - marker font for names only */
  .font-display-mock {
    /* Already defined - restrict usage documentation */
  }
  ```

- [x] **Component updates for typography**
  - [x] [TokenCard.tsx](components/profile/TokenCard.tsx): Token score uses font-stat
  - [x] [TierBadge.tsx](components/ui/TierBadge.tsx): Removed animate-gradient-x, uses clean bold uppercase
  - [x] [LeaderboardRow.tsx](components/leaderboard/LeaderboardRow.tsx): All score/rank displays use font-stat
  - [x] [ProfileHoverCard.tsx](components/ui/ProfileHoverCard.tsx): Score and rank use font-stat
  - [x] [AchievementBadge.tsx](components/ui/AchievementBadge.tsx): Removed animate-gradient-x
  - [x] [SearchBar.tsx](components/SearchBar.tsx): Search result scores use font-stat
  - [x] [page.tsx](app/(public)/page.tsx): Landing page stats and demo card use font-stat
  - [x] [kols/page.tsx](app/(public)/kols/page.tsx): KOL scores use font-stat

---

## 2. Profile Header Redesign

### Current Problems
- [x] Audit: Avatar, name, badges, social links, wallet info all fighting for attention
- [x] "Share Profile" button floating awkwardly in isolation
- [x] Tier badge and "Migrations" count disconnected from main info
- [x] Giant score number in background (decorative) competes with functional stats

### Tasks

- [x] **Consolidate header into clear sections**

  **Section A: Identity Row (horizontal)** ✓
  - Avatar (keep current size, single personality element)
  - Name (Marker font — the ONLY element using it)
  - KOL Badge (if applicable)
  - Verified badge
  - Twitter/X link icon
  - Pump.fun link button (now uses accent color, not gradient)
  
  **Section B: Wallet + Tier Row** ✓
  - Primary wallet address with copy button
  - "+N more" wallet indicator
  - TierBadge (size reduced to sm)
  - Migrations badge (if > 0)

  **Section C: Actions Row** ✓
  - Share Profile button (standardized sizing)
  - Future: "Rescan" button for authenticated users

- [x] **Remove decorative background score number**
  - Removed the giant `absolute top-0 right-0` score element entirely
  - Header is now cleaner and focused

- [x] **Move Achievement Badges closer to header**
  - [x] Reduced `BadgeGrid` margin to `mb-6` (was `mt-8`)
  - [x] Reduced `maxDisplay` from 6 to 4 for cleaner look

---

## 3. Stats Grid Overhaul

### Current Problems
- [x] Four separate chunky boxes at bottom of header
- [x] All stats use marker font — makes data hard to scan
- [x] Visual hierarchy reversed: most important data (Score, Rank) not emphasized

### Tasks

- [x] **Convert to horizontal "Status Bar" layout**
  - Now uses single unified `bg-dark-light/50` container
  - Grid layout with 2x2 on mobile, 4 columns on desktop
  - Reduced gaps and padding for tighter look

- [x] **Primary stat emphasis (DevCred Score)**
  - [x] Added `animate-glow-pulse` to Score section ONLY (if score >= 600)
  - [x] Larger font size than other stats
  - [x] Included progress bar showing position on 0-740 scale with "/740" indicator

- [x] **Styling updates**
  - [x] Used `border-cream/10` for subtler borders
  - [x] Single unified container instead of separate cards
  - [x] Stats typography uses `font-stat` (Phase 1)

- [x] **File changes**
  - [x] [profile/\[handle\]/page.tsx](app/(public)/profile/[handle]/page.tsx): Complete stats grid refactor

---

## 4. Grid Background Fix

### Current Problems
- [x] Grid pattern too high-contrast and distracting
- [x] Makes UI look like a Figma canvas, not a finished product
- [x] Competes with actual content

### Tasks

- [x] **Reduce grid visibility in [globals.css](app/globals.css)**
  - Updated `.grid-pattern` class to use `opacity: 0.05`
  
- [x] **Update inline grid styles in components**
  - [x] [profile/\[handle\]/page.tsx](app/(public)/profile/[handle]/page.tsx): Header background pattern → `opacity-[0.03]`
  - [x] [page.tsx](app/(public)/page.tsx): Hero right section grid → `opacity-[0.05]`

- [x] **Card rotation reduced**
  - Demo card rotation reduced from -3deg to -2deg for subtler effect

---

## 5. Badge System Refinement

### Current Problems
- [ ] All badges potentially glowing — if everything glows, nothing is special
- [x] `animate-glow-pulse` and `animate-gold-glow` applied too liberally ✅ Fixed
- [x] Achievement badges fighting for attention with tier badge ✅ Fixed

### Tasks

- [x] **Establish glow hierarchy** ✅
  - `animate-gold-glow`: LEGEND tier only (score >= 700)
  - `animate-glow-pulse`: Score card for Elite tier (600-699)
  - No glow: All other badges and elements - TierBadge only glows for Legend

- [x] **Reduce badge sizes in profile header** ✅
  - [x] [BadgeGrid.tsx](components/profile/BadgeGrid.tsx): Default `maxDisplay` from 6 → 4
  - [x] Use `size="sm"` instead of `size="md"` in profile context

- [x] **Update [AchievementBadge.tsx](components/ui/AchievementBadge.tsx)** ✅
  - [x] Remove `animate-gradient-x` from all badges (too busy)
  - [x] Keep hover effects but remove perpetual animations

---

## 6. Color Palette Enforcement

### Current Problems
- [x] CSS defines sophisticated cream/dark/accent palette ✅
- [x] Implementation uses harsh neon blues and purples from tier system ✅ Fixed - muted solid colors
- [x] Inconsistent use of `--border`, `--text-muted` variables ✅ Fixed

### Tasks

- [x] **Audit and fix color usage** ✅
  - [x] [TierBadge.tsx](components/ui/TierBadge.tsx): Replaced gradients with solid muted colors
  - [x] [TokenCard.tsx](components/profile/TokenCard.tsx): Simplified styling with consistent border colors
  - [x] [LeaderboardRow.tsx](components/leaderboard/LeaderboardRow.tsx): Unified border colors

- [x] **Create muted tier color variants** ✅ Using Tailwind utility colors instead of custom vars

- [x] **Button standardization** ✅
  - [x] All buttons now have explicit height classes: sm (h-8), md (h-10), lg (h-12)
  - [x] Consistent padding and shadow treatment

---

## 7. Token Card Cleanup

### Current Problems
- [x] Heavy shadows (`shadow-[6px_6px_0px_0px]`) on every card — too playful ✅ Fixed
- [x] Multiple badge/tag overlays ("Elite", "Strong", "Active", "Migrated") ✅ Fixed
- [x] Gradients on top strip too saturated ✅ Fixed

### Tasks

- [x] **Simplify card styling** ✅
  - [x] Reduced shadow to `shadow-[3px_3px_0px_0px]`
  - [x] Removed corner badges ("Elite", "Strong") — score color provides this info
  - [x] Consolidated status indicators into single row

- [x] **Token name typography** ✅
  - [x] Using `font-bold` for token names
  - [x] Score number: `font-stat` class for consistent data feel

- [x] **File: [TokenCard.tsx](components/profile/TokenCard.tsx)** ✅

---

## 8. Leaderboard Visual Consistency

### Current Problems
- [x] Top 3 have large medal treatment, rest are regular rows — jarring transition ✅ Fixed
- [x] Score glows compete with rank medals ✅ Fixed
- [x] Mobile responsive issues with cramped layouts ✅ Fixed

### Tasks

- [x] **Softer transition from top 3 to rest** ✅
  - [x] Reduced medal size from `w-14 h-14` to `w-10 h-10` / `w-12 h-12`
  - [x] Reduced padding and gaps

- [x] **Score display cleanup** ✅
  - [x] Removed gradient animations
  - [x] Using consistent `font-stat` typography

- [x] **Mobile fixes** ✅
  - [x] Reduced padding on mobile (`p-4` vs `p-5`)
  - [x] Tighter gaps on mobile layouts

---

## 9. Animation Restraint

### Current Problems
- [x] `animate-gradient-x` on too many elements ✅ Removed from TierBadge, AchievementBadge
- [x] `animate-shimmer` creating visual noise ✅
- [x] Hover effects stacking with perpetual animations ✅

### Tasks

- [x] **Audit all animation usage** ✅
  - [x] Keep: `animate-pulse` on connection status dot
  - [x] Keep: `animate-glow-pulse` on SINGLE hero element (score card for Elite+)
  - [x] Removed: `animate-gradient-x` from tier badges (now solid colors)
  - [x] `animate-shimmer` reserved for loading states

- [x] **Update [globals.css](app/globals.css)** ✅
  - [x] Added `@media (prefers-reduced-motion: reduce)` to disable all animations
  - [x] Added focus-visible styles for keyboard navigation
  - [x] Added skip-link styles for screen readers
  - [x] Added `.sr-only` utility for screen reader text

---

## 10. Component Standardization

### Tasks

- [x] **Button heights** ✅
  - [x] Small: `h-8` (32px)
  - [x] Medium: `h-10` (40px) — default
  - [x] Large: `h-12` (48px)
  - [x] Updated [Button.tsx](components/ui/Button.tsx)

- [x] **Border widths** ✅
  - [x] Cards: `border-2` (consistent)
  - [x] Badges: `border` (1px)
  - [x] Accent borders: `border-2`

- [x] **Shadow consistency** ✅
  - [x] Cards: `shadow-[3px_3px_0px_0px]`
  - [x] Buttons: `shadow-[3px_3px_0px_0px]`
  - [x] Hover: reduce shadow, translate position

---

## 11. Landing Page Polish ✅ COMPLETE

### Current Problems
- [x] Hero card demo good, but decorative tags too playful ✅ Made subtle
- [x] "How it Works" section well-structured ✅
- [x] Leaderboard preview section needs consistency with main leaderboard ✅

### Tasks

- [x] **Hero demo card** ✅
  - [x] Made floating tags more subtle (smaller, reduced opacity, removed emojis)
  - [x] Reduced card rotation from `-2deg` to `-1deg`
  - [x] Softened shadow from `16px` to `8px`

- [x] **Statistics row** ✅
  - [x] Uses `font-stat` class for numbers
  - [x] Alignment and sizing match profile stats

---

## 12. Mobile Responsive Fixes ✅ COMPLETE

### Tasks

- [x] **Profile page mobile** ✅
  - [x] Adjusted padding and gaps for mobile
  - [x] Stats grid responsive

- [x] **Token cards mobile** ✅
  - [x] Reduced padding from `p-5` to `p-4` on mobile
  - [x] Stacked layout on mobile, row on desktop
  - [x] Truncated token names handled by flex-wrap

- [x] **Leaderboard mobile** ✅
  - [x] Reduced medal sizes
  - [x] Tighter padding

---

## 13. Accessibility Improvements ✅ COMPLETE

### Tasks

- [x] **Color contrast audit** ✅
  - [x] Added `.text-muted-accessible` class with darker color (#5A5A5A)
  - [x] Score colors tested on cream/dark backgrounds

- [x] **Focus states** ✅
  - [x] Added visible focus rings to all interactive elements
  - [x] Using `focus-visible:ring-2 focus-visible:ring-accent`
  - [x] Updated Button component with focus styles
  - [x] Updated TokenCard buttons/links with focus styles

- [x] **Screen reader labels** ✅
  - [x] Added `aria-label` to icon buttons (copy, external link)
  - [x] Added `aria-hidden="true"` to decorative icons
  - [x] TierBadge has `role="status"` and `aria-label`
  - [x] Added skip-to-main-content link in layout

- [x] **Reduced motion** ✅
  - [x] Added `@media (prefers-reduced-motion: reduce)` to disable animations
  - [x] All animation classes disabled for users who prefer reduced motion

---

## 14. Performance Optimizations

### Tasks

- [x] **Reduce CSS animations on mobile** ✅
  - [x] Covered by `prefers-reduced-motion` media query
  
- [ ] **Image optimization**
  - [ ] Ensure all avatars use `next/image` with proper sizes
  - [ ] Lazy load token card images

---

## Priority Order (Implementation Phases)

### Phase 1: Typography (Critical)
1. Refactor score display typography
2. Update stats grid to use clean fonts
3. Restrict marker font to usernames only

### Phase 2: Layout Structure
1. Redesign stats grid to horizontal status bar
2. Consolidate header elements
3. Reduce grid background opacity

### Phase 3: Visual Polish
1. Standardize badge animations (glow hierarchy)
2. Token card simplification
3. Button and border consistency

### Phase 4: Responsive & Accessibility
1. Mobile layout fixes
2. Focus states
3. Animation reduction for accessibility

---

## Files to Modify

| File | Changes |
|------|---------|
| [globals.css](app/globals.css) | Typography utilities, grid opacity, animation refinements |
| [profile/\[handle\]/page.tsx](app/(public)/profile/[handle]/page.tsx) | Header restructure, stats grid, typography classes |
| [TokenCard.tsx](components/profile/TokenCard.tsx) | Shadow reduction, typography, badge removal |
| [TierBadge.tsx](components/ui/TierBadge.tsx) | Remove `animate-gradient-x`, mute colors |
| [AchievementBadge.tsx](components/ui/AchievementBadge.tsx) | Remove perpetual animations |
| [BadgeGrid.tsx](components/profile/BadgeGrid.tsx) | Reduce maxDisplay, size props |
| [LeaderboardRow.tsx](components/leaderboard/LeaderboardRow.tsx) | Typography, glow removal |
| [Button.tsx](components/ui/Button.tsx) | Height standardization |
| [page.tsx](app/(public)/page.tsx) | Hero card refinements |
| [ShareButton.tsx](components/profile/ShareButton.tsx) | Button sizing consistency |

---

## Success Criteria

- [x] Score/rank numbers are easily readable at a glance (clean sans-serif)
- [x] Only username uses "fun" marker font
- [x] Grid backgrounds barely visible (< 5% opacity)
- [x] Only ONE element glows at a time (score card for high-tier users)
- [x] Consistent button heights across all components
- [x] Mobile layouts are clean and functional
- [x] Visual hierarchy clear: Avatar → Name → Score → Details

---

## Status: ✅ COMPLETE

All phases of the UI professionalization plan have been implemented.
