import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // WHY: three themes override these same token names, so Tailwind must
      // reference the variables, never literal hex. A class like
      // `text-brand` follows the active theme; `text-[#7B0017]` cannot and
      // silently breaks theming (that is what layout.tsx used to do).
      colors: {
        canvas: "rgb(var(--rgb-canvas) / <alpha-value>)",
        nav: "rgb(var(--rgb-nav) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--rgb-card) / <alpha-value>)",
          hover: "rgb(var(--rgb-card-hover) / <alpha-value>)",
        },
        raised: "rgb(var(--rgb-card) / <alpha-value>)",
        input: "rgb(var(--rgb-input) / <alpha-value>)",
        line: {
          DEFAULT: "rgb(var(--rgb-line) / <alpha-value>)",
          subtle: "rgb(var(--rgb-line-subtle) / <alpha-value>)",
        },
        content: {
          DEFAULT: "rgb(var(--rgb-text) / <alpha-value>)",
          secondary: "rgb(var(--rgb-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--rgb-text-muted) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--rgb-brand) / <alpha-value>)",
          hover: "var(--brand-primary-hover)",
          on: "var(--brand-primary-text)",
        },
        gold: {
          DEFAULT: "rgb(var(--rgb-gold) / <alpha-value>)",
          bright: "var(--brand-gold-bright)",
          on: "var(--brand-gold-text)",
        },
        active: {
          bg: "var(--bg-active-tab)",
          fg: "var(--text-active-tab)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      fontFamily: {
        // Overriding `sans` makes Cairo the app default. Tailwind's stock
        // `font-sans` stack (ui-sans-serif, system-ui, ...) was winning on
        // <body>, so the Arabic face the app imports never rendered.
        sans: ["var(--font-cairo)", "Tajawal", "system-ui", "sans-serif"],
        cairo: ["var(--font-cairo)", "Tajawal", "sans-serif"],
      },
      fontSize: {
        // Arabic needs more leading than Latin: deep descenders (ج، ح، خ) and
        // stacked marks collide at 1.5.
        statement: ["2.125rem", { lineHeight: "1.35", letterSpacing: "-0.02em" }],
        title: ["1.625rem", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        section: ["1.1875rem", { lineHeight: "1.5" }],
        label: ["0.8125rem", { lineHeight: "1.4", fontWeight: "600" }],
        meta: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        // Cards are rectangles. The old UI gave nearly everything 9999px,
        // which flattened hierarchy and read as a generic pill-card kit.
        card: "14px",
        control: "12px",
        sheet: "20px",
      },
      spacing: {
        // 8px rhythm. Tap targets are sized from these, not ad hoc.
        tap: "44px",
        "tap-lg": "48px",
        bar: "56px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-card-elevated)",
        overlay: "var(--shadow-overlay)",
        gold: "var(--shadow-gold)",
      },
      transitionDuration: {
        // Shared timing tokens. One duration copied everywhere is exactly why
        // transitions feel arbitrary.
        instant: "120ms",
        quick: "180ms",
        smooth: "260ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      maxWidth: {
        // Arabic runs long visually; readable measure is tighter than 75ch.
        prose: "68ch",
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [],
};

export default config;
