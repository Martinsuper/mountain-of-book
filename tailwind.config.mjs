/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '720px',
            prose: {
              fontSize: '16px',
              lineHeight: '1.6'
            }
          }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
