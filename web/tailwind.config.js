/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#2563EB',   // blue-600  — matches BirdNET site
          dark:    '#1D4ED8',   // blue-700
          light:   '#DBEAFE',   // blue-100
          faint:   '#EFF6FF',   // blue-50
          border:  '#BFDBFE',   // blue-200
        },
        ink:    '#111827',   // gray-900
        body:   '#374151',   // gray-700
        muted:  '#6B7280',   // gray-500
        subtle: '#9CA3AF',   // gray-400
        rule:   '#E5E7EB',   // gray-200
        sheet:  '#F9FAFB',   // gray-50
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)',
      },
      animation: {
        blink: 'blink 1.1s step-end infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
