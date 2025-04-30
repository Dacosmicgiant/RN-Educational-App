/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF', // Matches Colors.PRIMARY (iOS blue)
        success: '#34C759', // Green for high score, correct
        warning: '#FF9500', // Orange for medium score, skipped
        danger: '#FF3B30', // Red for low score, incorrect
        background: '#F5F7FA', // Background
        textDark: '#333', // Primary text
        textGray: '#666', // Secondary text
        grayLight: '#CCC', // Light gray for icons
      },
    },
  },
  plugins: [],
}