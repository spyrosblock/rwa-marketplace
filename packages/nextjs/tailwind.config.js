/** @type {import('tailwindcss').Config} */
const colors = {
  darkest: "#18181B",
  darkGrey: "#292929",
  grey: "#444449",
  lightGrey: "#ddd",
  lightestGrey: "#f7f7f7",
  white: "#ffffff",
  neonGreen: "#84CC16",
  green: "#84CC16"
};
module.exports = {
  colors: colors,
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: ["selector", "[data-theme='dark']"],
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        light: {
          primary: "#93BBFB",
          secondary: "#DAE8FF",
          neutral: colors.lightestGrey,
          accent: colors.green,
          "base-100": colors.white,
          "base-200": colors.lightestGrey,
          //   "primary-content": "#212638",
          // "secondary-content": "#212638",
          //   "accent-content": "#212638",
          //   "neutral-content": "#ffffff",
          //   "base-200": "#f4f8ff",
          //   "base-300": "#DAE8FF",
          // "base-content": "#212638",
          //   info: "#93BBFB",
          //   success: "#34EEB6",
          //   warning: "#FFCF72",
          //   error: "#FF8863",

          //   ".tooltip": {
          //     "--tooltip-tail": "6px",
          //   },
          //   ".link": {
          //     textUnderlineOffset: "2px",
          //   },
          //   ".link:hover": {
          //     opacity: "80%",
          //   },
        },
      },
      {
        dark: {
          primary: colors.darkest,
          secondary: colors.darkGrey,
          neutral: colors.grey,
          accent: colors.neonGreen,
          "base-100": colors.darkest,
          //     "primary-content": "#F9FBFF",
          //     "secondary-content": colors.darkGrey,
          //     "accent-content": "#F9FBFF",
          //     "neutral-content": "#FFFFFF0F",
          //     "base-200": "#2A3655",
          //     "base-300": "#212638",
          //     "base-content": "#F9FBFF",
          //     info: "#385183",
          //     success: "#34EEB6",
          //     warning: "#FFCF72",
          //     error: "#FF8863",

          //     "[data-theme='dark'] .bg-secondary": { "background-color": colors.darkGray },

          //     ".tooltip": {
          //       "--tooltip-tail": "6px",
          //       "--tooltip-color": "oklch(var(--p))",
          //     },
          //     ".link": {
          //       textUnderlineOffset: "2px",
          //     },
          //     ".link:hover": {
          //       opacity: "80%",
          //     },
        },
      },
    ],
  },
  theme: {
    extend: {
      faded: { opacity: "50%" },
      colors: {
        redBrand: "rgb(255, 0, 0)",
        blueBrand: "rgb(24, 145, 255)",
        yellowBrand: "rgb(255, 255, 0)",
      },
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
