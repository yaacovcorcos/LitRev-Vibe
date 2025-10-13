/**
 * Theme helpers leveraging shared design tokens.
 * Useful for shadcn/ui configuration or any custom theming layer.
 */

import { tokens } from './tokens';

export const theme = {
  colors: {
    primary: tokens.colors.brand.indigo[600],
    primaryForeground: '#FFFFFF',
    secondary: tokens.colors.brand.teal[500],
    secondaryForeground: '#FFFFFF',
    muted: tokens.colors.neutral[200],
    mutedForeground: tokens.colors.neutral[600],
    accent: tokens.colors.brand.indigo[200],
    accentForeground: tokens.colors.neutral[800],
    destructive: tokens.colors.danger,
    destructiveForeground: '#FFFFFF',
    border: tokens.colors.neutral[200],
    input: tokens.colors.neutral[200],
    ring: tokens.colors.brand.indigo[500],
    background: '#FFFFFF',
    foreground: tokens.colors.neutral[900],
  },
  radius: {
    sm: tokens.radii.sm,
    md: tokens.radii.md,
    lg: tokens.radii.lg,
  },
  elevation: tokens.elevation,
  spacing: tokens.spacing,
  typography: tokens.typography,
};

export type Theme = typeof theme;
