/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Referencing CSS variables from globals.css for general purpose
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        accent: 'var(--accent)',
        // Specific custom colors for direct Tailwind classes
        champagne: '#f7e7ce',
        'champagne-darker': '#e6d6b8',
        rubyred: '#800020',
        'rubyred-darker': '#6a001a',
        forestgreen: '#228B22',
        // Existing neutrals and other colors (if needed)
        'neutral-100': '#f5f5f5',
        'neutral-200': '#e5e5e5',
        'neutral-300': '#d4d4d4',
        'gray-900': '#171717',
        'gray-600': '#4b5563',
        'green-500': '#86efac',
        'red-600': '#ef4444',
        'red-700': '#bf000f',
      },    },
  },
  plugins: [],
}