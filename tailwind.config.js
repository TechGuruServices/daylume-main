/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    darkMode: 'class',
    // Optimize: Future-proofing for Tailwind v4
    future: {
        hoverOnlyWhenSupported: true,
    },
    theme: {
        extend: {
            colors: {
                // Deep Space Theme
                midnight: {
                    DEFAULT: '#020617', // Slate 950
                    light: '#0f172a',   // Slate 900
                    lighter: '#1e293b'  // Slate 800
                },
                // Glass Surfaces
                glass: {
                    DEFAULT: 'rgba(255, 255, 255, 0.03)',
                    hover: 'rgba(255, 255, 255, 0.08)',
                    active: 'rgba(255, 255, 255, 0.12)',
                    border: 'rgba(255, 255, 255, 0.08)',
                    highlight: 'rgba(255, 255, 255, 0.15)'
                },
                // Neon Accents
                primary: {
                    DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
                    glow: 'rgb(var(--primary) / 0.5)'
                },
                secondary: {
                    DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
                    glow: 'rgb(var(--secondary) / 0.5)'
                },
                accent: {
                    DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
                    glow: 'rgb(var(--accent) / 0.5)'
                },
                // Semantic
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#06b6d4'
            },
            fontFamily: {
                // Optimized: Only 2 font families, system fallbacks for fast FOUT
                sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
                heading: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'monospace']
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'
            },
            backdropBlur: {
                xs: '2px',
                md: '12px',
                lg: '24px',
                xl: '40px'
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'slide-in-right': 'slideInRight 0.5s ease-out forwards',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate'
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                slideInRight: {
                    '0%': { transform: 'translateX(20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' }
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px var(--tw-shadow-color)' },
                    '100%': { boxShadow: '0 0 20px var(--tw-shadow-color)' }
                }
            }
        }
    },
    plugins: []
};
