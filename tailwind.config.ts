import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Color primario por tenant, seteado vía CSS var desde branding.jsonb
        primary: "var(--color-primary, #1d4ed8)",
      },
    },
  },
  plugins: [],
};

export default config;
