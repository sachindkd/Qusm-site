import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0E14",
        panel: "#12161F",
        panel2: "#171C27",
        border: "#262C3A",
        borderhi: "#3A4256",
        gold: "#C2A05F",
        golddim: "#8A7645",
        olive: "#5C7A4E",
        red: "#8C4A3A",
        textdim: "#8B93A5",
        textfaint: "#5A6274",
      },
      fontFamily: {
        serif: ["Spectral", "serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
