/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    darkMode: 'class',
    safelist: [
        'bg-green-500', 'text-green-500',
        'bg-blue-500', 'text-blue-500',
        'bg-purple-500', 'text-purple-500',
        'bg-orange-500', 'text-orange-500',
        'bg-brand-gold', 'text-brand-gold',
    ],
    theme: {
        extend: {
            fontFamily: {
                'serif': ['Cormorant Garamond', 'serif'],
                'sans': ['Lato', 'sans-serif'],
            },
            colors: {
                'brand-dark': '#222222',
                'brand-dark-gray': '#333333',
                'brand-mid-gray': '#555555',
                'brand-light-gray': '#F5F5F5',
                'brand-gold': '#c9a96e',
            }
        }
    },
    plugins: [],
}
