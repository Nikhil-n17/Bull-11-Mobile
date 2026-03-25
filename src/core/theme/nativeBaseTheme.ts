/**
 * NativeBase Theme Configuration
 * Bull-11 color system and component styling
 */

import { extendTheme } from 'native-base';

export const nativeBaseTheme = extendTheme({
  colors: {
    // Primary brand colors (Bull-11 green #006e1c)
    primary: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#4CAF50',
      500: '#006e1c', // Main Bull-11 green
      600: '#005a17',
      700: '#004712',
      800: '#00330d',
      900: '#002008',
    },
    // Success colors (for gains/positive)
    success: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#4CAF50',
      500: '#006e1c', // Bull-11 green
      600: '#005a17',
      700: '#004712',
      800: '#00330d',
      900: '#002008',
    },
    // Error colors (for losses/negative)
    error: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#b3272a', // Main Bull-11 red
      600: '#9a2124',
      700: '#811b1e',
      800: '#681618',
      900: '#4f1012',
    },
    // Secondary colors (use green to match primary)
    secondary: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#4CAF50',
      500: '#006e1c', // Same as primary for consistency
      600: '#005a17',
      700: '#004712',
      800: '#00330d',
      900: '#002008',
    },
    // Info colors
    info: {
      500: '#2196F3',
    },
    // Warning colors
    warning: {
      500: '#FF9800',
    },
    // Neutral grays
    gray: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  fontConfig: {
    Inter: {
      100: { normal: 'Inter-Light' },
      200: { normal: 'Inter-Light' },
      300: { normal: 'Inter-Light' },
      400: { normal: 'Inter-Regular' },
      500: { normal: 'Inter-Medium' },
      600: { normal: 'Inter-SemiBold' },
      700: { normal: 'Inter-Bold' },
      800: { normal: 'Inter-ExtraBold' },
      900: { normal: 'Inter-Black' },
    },
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    mono: 'Inter',
  },
  fontSizes: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
    '7xl': 72,
  },
  space: {
    px: '1px',
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    32: 128,
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'full', // Pill-shaped buttons
        _text: {
          fontWeight: 600,
        },
      },
      defaultProps: {
        colorScheme: 'primary',
      },
      variants: {
        solid: {
          bg: 'primary.500',
          _pressed: {
            bg: 'primary.600',
          },
          _text: {
            color: 'white',
          },
        },
        outline: {
          borderColor: 'primary.500',
          borderWidth: 2,
          _text: {
            color: 'primary.500',
          },
          _pressed: {
            bg: 'primary.50',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        borderRadius: 'lg',
        bg: 'gray.100',
        borderWidth: 0,
        fontSize: 'md',
        _focus: {
          bg: 'gray.50',
          borderColor: 'primary.500',
          borderWidth: 1,
        },
      },
    },
    Card: {
      baseStyle: {
        borderRadius: 'xl',
        bg: 'white',
        shadow: 0, // Remove shadow for tonal design
        borderWidth: 0, // Remove border
        p: 4,
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'md',
        px: 2,
        py: 1,
        _text: {
          fontSize: 'xs',
          fontWeight: 600,
        },
      },
      variants: {
        live: {
          bg: 'success.500',
          _text: {
            color: 'white',
          },
        },
        confirmed: {
          bg: 'success.50',
          _text: {
            color: 'success.700',
          },
        },
        fastFilling: {
          bg: 'error.50',
          _text: {
            color: 'error.700',
          },
        },
      },
    },
  },
  config: {
    initialColorMode: 'light',
  },
});

export type CustomTheme = typeof nativeBaseTheme;
