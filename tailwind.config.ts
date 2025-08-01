import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				}
			},
			spacing: {
				'0': 'var(--space-0)',
				'px': 'var(--space-px)',
				'0.5': 'var(--space-0-5)',
				'1': 'var(--space-1)',
				'1.5': 'var(--space-1-5)',
				'2': 'var(--space-2)',
				'2.5': 'var(--space-2-5)',
				'3': 'var(--space-3)',
				'3.5': 'var(--space-3-5)',
				'4': 'var(--space-4)',
				'5': 'var(--space-5)',
				'6': 'var(--space-6)',
				'7': 'var(--space-7)',
				'8': 'var(--space-8)',
				'9': 'var(--space-9)',
				'10': 'var(--space-10)',
				'11': 'var(--space-11)',
				'12': 'var(--space-12)',
				'14': 'var(--space-14)',
				'16': 'var(--space-16)',
				'20': 'var(--space-20)',
				'24': 'var(--space-24)',
				'28': 'var(--space-28)',
				'32': 'var(--space-32)',
				'36': 'var(--space-36)',
				'40': 'var(--space-40)',
				'44': 'var(--space-44)',
				'48': 'var(--space-48)',
				'52': 'var(--space-52)',
				'56': 'var(--space-56)',
				'60': 'var(--space-60)',
				'64': 'var(--space-64)',
				'72': 'var(--space-72)',
				'80': 'var(--space-80)',
				'96': 'var(--space-96)',
				// Semantic spacing tokens
				'section': 'var(--spacing-section)',
				'section-lg': 'var(--spacing-section-lg)',
				'component': 'var(--spacing-component)',
				'element': 'var(--spacing-element)',
				'tight': 'var(--spacing-tight)',
				'loose': 'var(--spacing-loose)',
				'gutter': 'var(--layout-gutter)',
				'gutter-lg': 'var(--layout-gutter-lg)',
			},
			backgroundImage: {
				'gradient-mountain': 'var(--gradient-mountain)',
				'gradient-forest': 'var(--gradient-forest)', 
				'gradient-sky': 'var(--gradient-sky)',
				'gradient-sunset': 'var(--gradient-sunset)'
			},
			boxShadow: {
				'cabin': 'var(--shadow-cabin)',
				'warm': 'var(--shadow-warm)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			fontFamily: {
				'sans': ['Inter', 'system-ui', 'sans-serif'],
				'serif': ['Georgia', 'serif'],
				'mono': ['Menlo', 'Monaco', 'monospace'],
				'display': ['Playfair Display', 'serif'],
				'body': ['Open Sans', 'sans-serif'],
				'button': ['Roboto', 'sans-serif'],
				'script': ['Alex Brush', 'cursive'],
				'kaushan': ['Kaushan Script', 'cursive']
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
