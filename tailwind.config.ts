import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kinetic Logic design system (dark, mission-control)
        surface: {
          DEFAULT: "#101415",
          dim: "#101415",
          bright: "#363a3b",
          lowest: "#0b0f10",
          low: "#191c1e",
          container: "#1d2022",
          high: "#272a2c",
          highest: "#323537",
        },
        content: {
          DEFAULT: "#e0e3e5",
          variant: "#c3c6d1",
        },
        outline: {
          DEFAULT: "#8d919a",
          variant: "#43474f",
        },
        primary: {
          DEFAULT: "#a8c8ff",
          on: "#003062",
          container: "#003164",
          "on-container": "#789ad4",
        },
        secondary: {
          DEFAULT: "#9ce1ff",
          on: "#003545",
          container: "#00cbff",
          "on-container": "#005269",
        },
        tertiary: {
          DEFAULT: "#ffb780",
          on: "#4e2600",
          container: "#502700",
          "on-container": "#ea7d00",
        },
        // Signal / CTA accent
        accent: {
          DEFAULT: "#ff8900",
          on: "#2f1400",
        },
        cyan: {
          signal: "#00cbff",
        },
        danger: {
          DEFAULT: "#ffb4ab",
          on: "#690005",
          container: "#93000a",
          "on-container": "#ffdad6",
        },
        success: {
          DEFAULT: "#9ce1ff",
        },
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-xl": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "title-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px" }],
        "body-md": ["16px", { lineHeight: "24px" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "16px",
        "container-margin": "24px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
