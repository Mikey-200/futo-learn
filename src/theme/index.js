/**
 * FUTO Learn — Theme Configuration
 * Light and Dark themes using React Native Paper's MD3 theming system
 */

import {MD3LightTheme, MD3DarkTheme} from 'react-native-paper';

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#008000',        // FUTO Green
    secondary: '#0066CC',      // Blue accent
    background: '#FFFFFF',
    surface: '#F5F5F5',
    onSurface: '#212121',
    onBackground: '#212121',
    outline: '#E0E0E0',
    // Custom FUTO tokens
    textPrimary: '#212121',
    textSecondary: '#757575',
    cardBackground: '#FFFFFF',
    pillActive: '#0066CC',
    pillInactive: '#666666',
    headerBackground: '#008000',
    breadcrumbBackground: '#008000',
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4CAF50',        // Lighter FUTO Green for dark mode
    secondary: '#64B5F6',      // Light Blue for dark mode
    background: '#121212',
    surface: '#1E1E1E',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    outline: '#333333',
    // Custom FUTO tokens
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    cardBackground: '#2C2C2C',
    pillActive: '#64B5F6',
    pillInactive: '#888888',
    headerBackground: '#1A3A1A',
    breadcrumbBackground: '#1A3A1A',
  },
};
