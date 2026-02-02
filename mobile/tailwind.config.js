/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "#0B0F19",
                card: "#152033",
                primary: {
                    DEFAULT: "#2563EB",
                    dark: "#1D4ED8",
                },
                secondary: "#1E293B",
                success: "#10B981",
                danger: "#EF4444",
                muted: "#94A3B8",
            },
        },
    },
    plugins: [],
};
