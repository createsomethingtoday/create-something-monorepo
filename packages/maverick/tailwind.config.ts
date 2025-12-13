import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
    content: [
        "./src/**/*.{html,js,svelte,ts}",
    ],
    // Safelist dynamic color classes used with accentColor prop
    safelist: [
        // Background colors with opacity
        "bg-dme/10",
        "bg-dme/20",
        "bg-petrox/10",
        "bg-lithx/10",
        // Text colors
        "text-dme",
        "text-petrox",
        "text-lithx",
        // Border colors
        "border-dme",
        "border-dme/50",
        "border-petrox",
        "border-lithx",
        // Solid background colors
        "bg-dme",
        "bg-petrox",
        "bg-lithx",
        // Hover states
        "hover:bg-dme/20",
        "hover:border-dme/50",
        // Hover text colors for Introduction
        "group-hover:text-petrox",
        "group-hover:text-lithx",
        "group-hover:text-dme",
    ],
    theme: {
        screens: {
            "5xl": { max: "2299px" },
            "4xl": { max: "1899px" },
            "3xl": { max: "1719px" },
            "2xl": { max: "1419px" },
            xl: { max: "1179px" },
            lg: { max: "1023px" },
            md: { max: "767px" },
            sm: { max: "480px" },
        },
        extend: {
            colors: {
                // Grayscale - Industrial neutral palette
                g: {
                    50: "#ebebeb",
                    75: "#adadad",
                    100: "#8a8a8a",
                    200: "#585858",
                    300: "#363636",
                    400: "#262626",
                    500: "#212121",
                },
                w: {
                    50: "#fdfdfd",
                    75: "#f5f5f5",
                    100: "#f1f1f1",
                    200: "#eaeaea",
                    300: "#e6e6e6",
                    400: "#a1a1a1",
                    500: "#8c8c8c",
                },
                // Maverick X Brand Colors
                primary: {
                    50: "#E6F0FF",
                    100: "#CCE1FF",
                    200: "#99C3FF",
                    300: "#66A5FF",
                    400: "#3387FF",
                    500: "#0069FF",
                    600: "#0054CC",
                    700: "#003F99",
                    800: "#002A66",
                    900: "#001533",
                },
                accent: {
                    50: "#FFF4ED",
                    100: "#FFE9DB",
                    200: "#FFD3B6",
                    300: "#FFBD92",
                    400: "#FFA76D",
                    500: "#FF8C42",
                    600: "#FF6B0A",
                    700: "#C75000",
                    800: "#8F3900",
                    900: "#571F00",
                },
                // Product-specific colors
                petrox: {
                    50: "#FFF4E6",
                    100: "#FFE4C2",
                    DEFAULT: "#FF7A00",
                    500: "#FF7A00",
                    light: "#FF9433",
                    dark: "#E66900",
                },
                lithx: {
                    DEFAULT: "#00C2A8",
                    light: "#33D1BC",
                    dark: "#00917E",
                },
                dme: {
                    DEFAULT: "#06B6D4",
                    light: "#22D3EE",
                    dark: "#0891B2",
                },
            },
            zIndex: {
                1: "1",
                2: "2",
                3: "3",
                4: "4",
                5: "5",
            },
            spacing: {
                0.25: "0.0625rem",
                0.75: "0.1875rem",
                4.5: "1.125rem",
                5.5: "1.375rem",
                6.5: "1.75rem",
                7.5: "1.875rem",
                8.5: "2.125rem",
                9.5: "2.375rem",
                13: "3.25rem",
                15: "3.75rem",
                17: "4.25rem",
                18: "4.5rem",
                19: "4.75rem",
                21: "5.25rem",
                22: "5.5rem",
                23: "5.75rem",
                25: "6.25rem",
                26: "6.5rem",
                30: "7.5rem",
                34: "8.5rem",
                38: "9.5rem",
                42: "10.5rem",
                54: "13.5rem",
                58: "14.5rem",
            },
            transitionDuration: {
                DEFAULT: "200ms",
                fast: "150ms",
                slow: "300ms",
            },
            transitionTimingFunction: {
                DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
                "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
                "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
                "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
                spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
            animation: {
                'gradient': 'gradient 8s linear infinite',
                'blob': 'blob 7s infinite',
                'shine': 'shine 0.6s ease-in-out',
                'bounce-x': 'bounce-x 1.5s ease-in-out infinite',
            },
            keyframes: {
                gradient: {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    },
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                shine: {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '50%': { opacity: '1' },
                    '100%': { transform: 'translateX(100%)', opacity: '0' },
                },
                'bounce-x': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(2px)' },
                },
            },
            borderWidth: {
                DEFAULT: "0.0625rem",
                0: "0",
                2: "0.125rem",
                3: "0.1875rem",
                4: "0.25rem",
                8: "0.5rem",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
                "inter-tight": ["Inter Tight", "Inter", "system-ui", "sans-serif"],
            },
            fontSize: {
                0: ["0", "0"],
            },
            backgroundImage: {
                'radial-gradient': 'radial-gradient(90% 100% at 50% 20%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
            },
            borderRadius: {
                DEFAULT: "0",
                none: "0",
                sm: "0",
                md: "0",
                lg: "0",
                xl: "0",
                "2xl": "0",
                "3xl": "0",
                full: "0",
            },
        },
    },
    plugins: [
        plugin(function ({ addBase, addComponents, addUtilities }) {
            addBase({
                html: {
                    "@apply text-[calc(1rem+.15vw)] 4xl:text-[calc(1rem+.1vw)] 3xl:text-[1rem]": {},
                },
            });
            addComponents({
                ".container": {
                    "@apply max-w-[96rem] mx-auto px-12 3xl:max-w-[90rem] lg:px-8 md:px-5 sm:px-4":
                        {},
                },
                ".btn": {
                    "@apply inline-flex items-center justify-center h-12 px-4.5 border-2 font-sans font-medium text-body transition-colors":
                        {},
                },
                ".label": {
                    "@apply text-body font-normal text-g-100 md:text-caption":
                        {},
                },
                ".pt150": {
                    "@apply pt-[9.375rem] xl:pt-30 lg:pt-25":
                        {},
                },
                ".pb150": {
                    "@apply pb-[9.375rem] xl:pb-30 lg:pb-25":
                        {},
                },
                ".py150": {
                    "@apply py-[9.375rem] xl:py-30 lg:py-25":
                        {},
                },
                ".text-display": {
                    "@apply font-inter-tight text-[4rem] leading-[4.8rem] font-medium -tracking-[.01em] xl:text-[3rem] xl:leading-[3.3rem]":
                        {},
                },
                ".text-h1": {
                    "@apply font-inter-tight text-[3rem] leading-[3.75rem] font-medium xl:text-[2.19rem] xl:leading-[2.73rem]":
                        {},
                },
                ".text-h2": {
                    "@apply font-inter-tight text-[2.5rem] leading-[3.125rem] font-medium xl:text-[1.875rem] xl:leading-[2.34rem]":
                        {},
                },
                ".text-h3": {
                    "@apply font-inter-tight text-[1.625rem] leading-[2.03rem] font-medium":
                        {},
                },
                ".text-h4": {
                    "@apply font-inter-tight text-[1.5rem] leading-[1.875rem] font-medium":
                        {},
                },
                ".text-h5": {
                    "@apply font-inter-tight text-[1.25rem] leading-[1.56rem] font-medium xl:text-[1.125rem] xl:leading-[1.41rem]":
                        {},
                },
                ".text-paragraph": {
                    "@apply text-[1.125rem] leading-[1.6875rem]":
                        {},
                },
                ".text-body": {
                    "@apply text-[1rem] leading-[1.5rem]":
                        {},
                },
                ".text-caption": {
                    "@apply text-[0.875rem] leading-[1.225rem]":
                        {},
                },
                // Hero Components
                ".hero-title": {
                    "@apply font-inter-tight text-[6rem] leading-[1.1] font-medium tracking-tight text-white xl:text-[5rem] md:text-[2.5rem] md:leading-[1.15] sm:text-[2rem] sm:leading-[1.2]":
                        {},
                },
                ".hero-container": {
                    "@apply pt-[10.5rem] pb-[5rem] xl:pt-[7.5rem] xl:pb-[4rem] md:pt-[6rem] md:pb-[3rem]":
                        {},
                },
                ".hero-description": {
                    "@apply text-xl leading-relaxed text-white/80 font-normal xl:text-lg md:text-base md:leading-[1.6] sm:text-sm":
                        {},
                },
                // Section Spacing
                ".section-lg": {
                    "@apply py-40 xl:py-32 md:py-24":
                        {},
                },
                ".section-md": {
                    "@apply py-32 xl:py-24 md:py-20":
                        {},
                },
                ".section-sm": {
                    "@apply py-20 xl:py-16 md:py-12":
                        {},
                },
                // Grid Patterns
                ".grid-responsive-3": {
                    "@apply grid grid-cols-3 gap-8 xl:gap-6 lg:grid-cols-2 md:grid-cols-1":
                        {},
                },
                ".grid-responsive-2": {
                    "@apply grid grid-cols-2 gap-12 xl:gap-10 lg:grid-cols-1 lg:gap-8":
                        {},
                },
            });
            addUtilities({
                ".tap-highlight-color": {
                    "-webkit-tap-highlight-color": "rgba(0, 0, 0, 0)",
                },
                ".animation-delay-2000": {
                    "animation-delay": "2s",
                },
                ".animation-delay-4000": {
                    "animation-delay": "4s",
                },
            });
        }),
    ],
};
export default config;
