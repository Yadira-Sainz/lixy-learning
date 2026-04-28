import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			tourCardIn: {
  				'0%': { opacity: '0', transform: 'translateY(14px) scale(0.96)' },
  				'100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
  			},
  			tourIntroIn: {
  				'0%': { opacity: '0', transform: 'scale(0.94)' },
  				'100%': { opacity: '1', transform: 'scale(1)' },
  			},
  			tourHotspotBob: {
  				'0%, 100%': { transform: 'translate(-50%, 0)' },
  				'50%': { transform: 'translate(-50%, -8px)' },
  			},
  			tourBackdropPulse: {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.88' },
  			},
  		},
  		animation: {
  			'tour-card-in': 'tourCardIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) both',
  			'tour-intro-in': 'tourIntroIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
  			'tour-hotspot-bob': 'tourHotspotBob 1.65s ease-in-out infinite',
  			'tour-backdrop-pulse': 'tourBackdropPulse 2.4s ease-in-out infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
