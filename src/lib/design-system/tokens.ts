/**
 * Shared design tokens for the LitRev-Vibe workspace.
 * Tokens are defined in plain TypeScript so they can be imported by Tailwind config,
 * application components, and future design tooling.
 */

export const colors = {
  brand: {
    indigo: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
    },
    teal: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },
  },
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0EA5E9',
};

export const typography = {
  fontFamily: {
    sans: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    h1: '2.5rem', // 40px
    h2: '2rem', // 32px
    h3: '1.5rem', // 24px
    body: '1rem', // 16px
    small: '0.875rem', // 14px
    tiny: '0.75rem', // 12px
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.01em',
    normal: '0',
    loose: '0.01em',
  },
};

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
};

export const elevation = {
  none: '0 0 0 0 rgba(0, 0, 0, 0)',
  xs: '0 1px 2px rgba(15, 23, 42, 0.08)',
  sm: '0 2px 4px rgba(15, 23, 42, 0.1)',
  md: '0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.06)',
  lg: '0 20px 25px rgba(15, 23, 42, 0.1), 0 10px 10px rgba(15, 23, 42, 0.04)',
};

export const radii = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  pill: '999px',
};

export const tokens = {
  colors,
  typography,
  spacing,
  elevation,
  radii,
};

export type DesignTokens = typeof tokens;
