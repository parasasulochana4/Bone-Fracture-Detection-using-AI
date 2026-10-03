/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Dynamic color classes used via template literals
    'bg-sky-500', 'bg-sky-500/15', 'text-sky-400', 'text-sky-300', 'border-sky-500/30',
    'bg-amber-500', 'bg-amber-500/15', 'text-amber-400', 'text-amber-300', 'border-amber-500/30',
    'bg-emerald-500', 'bg-emerald-500/15', 'text-emerald-400', 'text-emerald-300', 'border-emerald-500/30',
    'bg-rose-500', 'bg-rose-500/15', 'text-rose-400', 'text-rose-300', 'border-rose-500/30',
    'bg-sky-500/20', 'bg-amber-500/20', 'bg-emerald-500/20', 'bg-rose-500/20',
    'from-sky-500/10', 'from-sky-500', 'to-cyan-600',
  ],
};
