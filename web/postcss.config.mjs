// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Add explicit options for Docker
      content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
        "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
      ],
    },
  },
};

export default config;