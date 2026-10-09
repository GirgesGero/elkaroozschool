# EL KAROOZ THEME SYSTEM & ACCENT ENGINE
=========================================

## 1. Theme Engine Overview

The EL KAROOZ School Theme Engine supports **4 Display Modes** and **4 Identity Accents**:

### Display Modes
1. **`luxury` (Default):** Deep Coptic Navy (`#070B14`) with Malt Gold accents and atmospheric glassmorphism.
2. **`dark`:** High-contrast Charcoal Dark (`#121316`) for low-light environments.
3. **`light`:** Crisp Warm Porcelain (`#F8F9FA`) with high readability.
4. **`system`:** Automatically matches the operating system's prefers-color-scheme setting.

### Identity Accents
1. **`gold` (الذهب القبطي الملكي):** Primary brand accent `#C29938`.
2. **`burgundy` (العنابي الكنسي):** Ecclesiastical wine `#7B0017`.
3. **`navy` (الأزرق النيلي):** Scholarly deep blue `#0B1B3D`.
4. **`emerald` (الأخضر النخل):** Palm emerald `#10B981`.

---

## 2. Persistence & Hydration Strategy

- The selected theme mode and accent are stored in `localStorage` under keys `elkarooz-theme-mode` and `elkarooz-theme-accent`.
- To prevent Flash of Wrong Theme (FOUC), an inline initialization script runs in `<head>` before rendering body content.
