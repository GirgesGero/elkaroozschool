# EL KAROOZ DESIGN SYSTEM & COMPONENT SPECIFICATION
====================================================
**Framework:** Next.js 14 (App Router) + Tailwind CSS + Lucide Icons  
**Philosophy:** Mobile-First, Accessible, Arabic RTL Native, High-Density Information Hierarchy  
**Design Studio Standard:** Non-templated, distinct monumental Coptic visual identity with fluid social dynamics.

---

## 1. Design Token Architecture (`globals.css`)

### A. Color Roles & CSS Variables

```css
:root {
  /* Surfaces */
  --bg-canvas: #070B14;
  --bg-surface: #0E182D;
  --bg-surface-elevated: #16233F;
  --bg-surface-overlay: rgba(7, 11, 20, 0.85);
  --bg-input: #131F37;

  /* Typography */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-inverse: #070B14;

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: rgba(194, 153, 56, 0.25);
  --border-highlight: #C29938;

  /* Brand Accents */
  --accent-gold: #C29938;
  --accent-gold-light: #DFB657;
  --accent-gold-soft: rgba(194, 153, 56, 0.15);
  --accent-burgundy: #7B0017;
  --accent-navy: #0B1B3D;
  --accent-emerald: #10B981;

  /* Semantic Feedback */
  --feedback-success: #10B981;
  --feedback-warning: #F59E0B;
  --feedback-danger: #EF4444;
  --feedback-info: #3B82F6;

  /* Layout Constants */
  --header-height: 3.75rem; /* 60px */
  --bottom-nav-height: 4rem; /* 64px */
  --radius-sm: 0.5rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.25rem;
  --radius-xl: 1.75rem;
  --radius-full: 9999px;
}
```

---

## 2. Component Hierarchy & Variants

### 1. `SmartHeader`
- **Behavior:** Tracks vertical scroll direction with threshold (20px). Hides on downward scroll past 80px, restores immediately on upward scroll or when reaching `scrollY < 40px`.
- **Elements:** App Emblem & Brand Name, Global Search Button, Live Notification Bell (with unread badge counter), Theme Quick Switcher, User Avatar Pill.

### 2. `SmartBottomNav`
- **Behavior:** Mobile-only floating glass bar. Hides gracefully on downward scroll to maximize screen real estate for reading and feed viewing, re-appears on scroll-up.
- **Items:**
  1. 🏠 الرئيسية (Feed)
  2. 👥 الفرق (Study Groups)
  3. 🔔 الإشعارات (Notifications)
  4. 👤 حسابي (Profile)
  5. ☰ المزيد (More Menu: Bible, Library, Marathon, Exams, MP3, Gallery, Settings)

### 3. `FeedPostCard`
- **Header:** User Avatar with Gold Rim, Author Name, Post Creation Timestamp (Relative Arabic time: "منذ ساعتين"), Group Scope Tag, Actions Menu (Delete for Admin/Author).
- **Body:** Rich Markdown text with link highlights and verse references.
- **Media Collage:** Responsive image grid supporting 1 to 5+ images with adaptive aspect ratios.
- **Reaction Bar:** 4 Coptic Reaction icons (`LIKE` 👍, `LOVE` ❤️, `PRAY` 🙏, `AMEN` ✝️) with active colored pills and live count.
- **Comments Section:** Collapsible threaded comments stream with real-time additions.

### 4. `SocialProfileHeader`
- **Cover Banner:** High-resolution decorative background with ambient liturgical gradients.
- **Avatar:** Large round avatar with 3px gold halo border.
- **Identity:** Full Name, Username (`@handle`), Confession Father, Role Badge (Admin, Super User, Servant, Secretariat, Trainee), Group Tag.
- **Action Buttons:** Edit Profile (Self/Admin), Status Toggle (Admin), Contact via Call / WhatsApp.
- **KPI Stats Cards:**
  - 📊 Attendance Rate Meter (`████████░░ 92%`)
  - 🏆 Marathon Participation Count
  - 🎓 Exams Average Grade

---

## 3. Accessibility & Motion Guidelines

- **Touch Targets:** All clickable interactive elements have a minimum bounding box of `44px × 44px` on touch screens.
- **Reduced Motion:** All transitions respect `@media (prefers-reduced-motion: reduce)`.
- **Keyboard Navigation:** Explicit visible focus rings with `focus-visible:ring-2 focus-visible:ring-karooz-gold`.
