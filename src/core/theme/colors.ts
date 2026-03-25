/**
 * Color Palette for Bull-11 App
 * Centralized color definitions following iOS design guidelines
 * All colors are in HEX format for consistency
 */

/**
 * Primary Brand Colors
 * Used for main actions, links, and primary UI elements
 */
export const primary = {
  main: '#007AFF',      // iOS Blue - Primary actions, links, active states
  light: '#4DA3FF',     // Lighter variant for hover/pressed states
  dark: '#0051D5',      // Darker variant for emphasis
  contrast: '#FFFFFF',  // Text color on primary background
} as const;

/**
 * Secondary Brand Colors
 * Used for headers, accents, and supporting UI elements
 */
export const secondary = {
  main: '#FF9800',      // Orange - Headers, warnings, accents
  light: '#FFB74D',     // Lighter variant
  dark: '#F57C00',      // Darker variant
  contrast: '#FFFFFF',  // Text color on secondary background
} as const;

/**
 * Success Colors
 * Used for positive feedback, gains, and success states
 */
export const success = {
  main: '#4CAF50',      // Green - Positive actions, gains
  light: '#66BB6A',     // Light green (0-2% gain)
  medium: '#4CAF50',    // Medium green (2-5% gain)
  dark: '#2E7D32',      // Dark green (5%+ gain)
  bg: '#E8F5E9',        // Light green background
  bgLight: '#F1F8E9',   // Very light green background
  contrast: '#FFFFFF',  // Text color on success background
} as const;

/**
 * Error/Danger Colors
 * Used for errors, losses, and destructive actions
 */
export const error = {
  main: '#f44336',      // Red - Errors, losses, delete actions
  light: '#EF5350',     // Light red (0-2% loss)
  medium: '#F44336',    // Medium red (2-5% loss)
  dark: '#C62828',      // Dark red (5%+ loss)
  bg: '#FFEBEE',        // Light red background
  contrast: '#FFFFFF',  // Text color on error background
} as const;

/**
 * Warning Colors
 * Used for warnings, cautions, and important notices
 */
export const warning = {
  main: '#FFC107',      // Amber - Warnings
  light: '#FFD54F',     // Lighter variant
  dark: '#FFA000',      // Darker variant
  bg: '#FFF9E6',        // Light amber background
  bgAlt: '#FFF3E0',     // Alternative light background
  contrast: '#000000',  // Text color on warning background
} as const;

/**
 * Info Colors
 * Used for informational content and neutral highlights
 */
export const info = {
  main: '#2196F3',      // Blue - Information, neutral highlights
  light: '#64B5F6',     // Lighter variant
  dark: '#1976D2',      // Darker variant
  bg: '#E3F2FD',        // Light blue background
  bgAlt: '#E7F3FF',     // Alternative light background
  contrast: '#FFFFFF',  // Text color on info background
} as const;

/**
 * Neutral/Gray Scale Colors
 * Used for backgrounds, surfaces, borders, and disabled states
 */
export const neutral = {
  white: '#FFFFFF',     // Pure white
  gray50: '#F9FAFB',    // Lightest gray
  gray100: '#F3F4F6',   // Very light gray (app background)
  gray200: '#E5E7EB',   // Light gray (borders)
  gray300: '#D1D5DB',   // Medium-light gray
  gray400: '#9CA3AF',   // Medium gray (disabled text)
  gray500: '#6B7280',   // Medium-dark gray (secondary text)
  gray600: '#4B5563',   // Dark gray
  gray700: '#374151',   // Darker gray
  gray800: '#1F2937',   // Very dark gray (primary text)
  gray900: '#111827',   // Almost black
  black: '#000000',     // Pure black
} as const;

/**
 * Background Colors
 * Semantic background colors for different surfaces
 */
export const background = {
  default: '#fafaf7',   // Warm off-white background (premium paper tone)
  paper: '#FFFFFF',     // Cards, modals, elevated surfaces
  alt: '#F5F5F5',       // Alternative background
  disabled: '#E9ECEF',  // Disabled elements background
} as const;

/**
 * Text Colors
 * Semantic text colors following contrast guidelines
 */
export const text = {
  primary: '#1a1c1c',   // Primary text (Stitch on-surface)
  secondary: '#5a666d', // Secondary text (Stitch on-surface-variant)
  disabled: '#9CA3AF',  // Disabled text (gray400)
  hint: '#999999',      // Placeholder/hint text
  inverse: '#FFFFFF',   // Text on dark backgrounds
} as const;

/**
 * Border Colors
 * Standard border colors for various UI elements
 */
export const border = {
  light: '#E5E7EB',     // Light borders (gray200)
  medium: '#D1D5DB',    // Medium borders (gray300)
  dark: '#9CA3AF',      // Dark borders (gray400)
  focus: '#007AFF',     // Focus/active border (primary)
} as const;

/**
 * Gaming-Specific Colors
 * Colors used for gaming UI elements and visualizations
 */
export const gaming = {
  // Rank colors
  rankS: '#FFD700',     // Gold - S rank
  rankA: '#4CAF50',     // Green - A rank
  rankB: '#2196F3',     // Blue - B rank
  rankC: '#FF9800',     // Orange - C rank
  rankD: '#f44336',     // Red - D rank

  // Stock visualization colors (non-semantic, for differentiation)
  stock1: '#2196F3',    // Blue
  stock2: '#9C27B0',    // Purple
  stock3: '#FF9800',    // Orange
  stock4: '#00BCD4',    // Teal
  stock5: '#3F51B5',    // Indigo

  // Performance indicators
  bestPerformer: '#4CAF50',   // Green
  worstPerformer: '#f44336',  // Red
  liveIndicator: '#4CAF50',   // Green (pulsing dot)

  // Momentum indicators
  strongGaining: '#2E7D32',   // Dark green
  gaining: '#66BB6A',         // Light green
  stable: '#757575',          // Gray
  losing: '#EF5350',          // Light red
  strongLosing: '#C62828',    // Dark red
} as const;

/**
 * Admin Panel Colors
 * Colors specific to admin interface
 */
export const admin = {
  header: '#007bff',    // Admin header background
  primary: '#007bff',   // Admin primary actions
  danger: '#dc3545',    // Destructive actions
  secondary: '#6c757d', // Secondary elements
  success: '#28a745',   // Success states
  info: '#17a2b8',      // Info states
  warning: '#ffc107',   // Warning states
  border: '#dee2e6',    // Admin borders
  text: {
    primary: '#212529',
    secondary: '#495057',
    muted: '#6c757d',
  },
} as const;

/**
 * Shadow Colors
 * Colors used for shadows and elevation effects
 */
export const shadow = {
  light: '#000000',     // Black with opacity for shadows
  medium: '#000000',
  dark: '#000000',
} as const;

/**
 * Complete Color Palette
 * Export all colors as a single object for easy access
 */
export const colors = {
  primary,
  secondary,
  success,
  error,
  warning,
  info,
  neutral,
  background,
  text,
  border,
  gaming,
  admin,
  shadow,
} as const;

/**
 * Type definitions for color palette
 */
export type Colors = typeof colors;
export type PrimaryColors = typeof primary;
export type SecondaryColors = typeof secondary;
export type SuccessColors = typeof success;
export type ErrorColors = typeof error;
export type WarningColors = typeof warning;
export type InfoColors = typeof info;
export type NeutralColors = typeof neutral;
export type BackgroundColors = typeof background;
export type TextColors = typeof text;
export type BorderColors = typeof border;
export type GamingColors = typeof gaming;
export type AdminColors = typeof admin;
export type ShadowColors = typeof shadow;
