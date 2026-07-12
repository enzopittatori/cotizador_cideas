import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        papel: "var(--papel)",
        tinta: "var(--tinta)",
        plano: "var(--plano)",
        fosforito: "var(--fosforito)",
        grafito: "var(--grafito)",
        linea: "var(--linea)",
        hoja: "var(--hoja-bg)",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        hoja: "0 1px 2px rgba(16, 34, 46, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
