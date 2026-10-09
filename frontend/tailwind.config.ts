import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        karooz: {
          crimson: "#881337", // أحمر قرمزي كنسي
          crimsonLight: "#9f1239",
          crimsonDark: "#4c0519",
          gold: "#d97706",
          goldLight: "#f59e0b",
          goldDark: "#b45309",
          navy: "#1e3a8a",
          navyLight: "#2563eb",
          navyDark: "#0f172a",
          cream: "#fbfbfb",
          surface: "#f8fafc",
          border: "#e2e8f0",
        },
      },
      fontFamily: {
        cairo: ["Cairo", "Tajawal", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
