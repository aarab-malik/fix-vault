import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ground: "#E8EEF4",
        panel: "#D6E6F5",
        brand: "#0A4A8A",
        ink: "#1A2330",
        warn: "#C9851A",
        fail: "#A33B3B",
        ok: "#2F6F5E",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
