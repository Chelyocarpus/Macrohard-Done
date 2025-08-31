/**
 * Utility functions for calculating color contrast and accessibility
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-digit hex codes
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Handle 6-digit hex codes
  if (hex.length === 6) {
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return { r, g, b };
  }
  
  return null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
function getLuminance(r: number, g: number, b: number): number {
  // Convert RGB to sRGB
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Determine if a background color is light or dark
 * Returns true if the color is considered light (luminance > 0.5)
 */
export function isLightColor(hexColor: string): boolean {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return false;
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  return luminance > 0.5;
}

/**
 * Get the best text color (black or white) for a given background color
 * to ensure WCAG AA compliance (contrast ratio >= 4.5:1)
 */
export function getContrastingTextColor(backgroundColor: string): 'white' | 'black' {
  const bgRgb = hexToRgb(backgroundColor);
  if (!bgRgb) return 'white'; // Default to white if color parsing fails
  
  // Test contrast with white text
  const whiteRgb = { r: 255, g: 255, b: 255 };
  const blackRgb = { r: 0, g: 0, b: 0 };
  
  const whiteContrast = getContrastRatio(bgRgb, whiteRgb);
  const blackContrast = getContrastRatio(bgRgb, blackRgb);
  
  // Return the color with better contrast
  // Prefer white for better visual consistency unless black provides significantly better contrast
  return whiteContrast >= 4.5 ? 'white' : blackContrast >= 4.5 ? 'black' : 'white';
}

/**
 * Get accessible text color classes for Tailwind CSS
 */
export function getAccessibleTextClasses(backgroundColor?: string): string {
  if (!backgroundColor) {
    return 'text-gray-600 dark:text-gray-400';
  }
  
  const textColor = getContrastingTextColor(backgroundColor);
  return textColor === 'white' ? 'text-white' : 'text-black';
}

/**
 * Check if a color meets WCAG AA contrast requirements against white/black
 */
export function meetsContrastRequirements(backgroundColor: string, textColor: 'white' | 'black' = 'white'): boolean {
  const bgRgb = hexToRgb(backgroundColor);
  if (!bgRgb) return false;
  
  const textRgb = textColor === 'white' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  const contrast = getContrastRatio(bgRgb, textRgb);
  
  return contrast >= 4.5; // WCAG AA standard
}

/**
 * Generate accessible color variations if the original doesn't meet contrast requirements
 */
export function getAccessibleColorVariant(originalColor: string): string {
  const rgb = hexToRgb(originalColor);
  if (!rgb) return originalColor;
  
  // If it already meets requirements with white text, return as-is
  if (meetsContrastRequirements(originalColor, 'white')) {
    return originalColor;
  }
  
  // Try darkening the color for better contrast with white text
  const darkenAmount = 0.3;
  const darkenedRgb = {
    r: Math.round(rgb.r * (1 - darkenAmount)),
    g: Math.round(rgb.g * (1 - darkenAmount)),
    b: Math.round(rgb.b * (1 - darkenAmount))
  };
  
  const darkenedHex = `#${darkenedRgb.r.toString(16).padStart(2, '0')}${darkenedRgb.g.toString(16).padStart(2, '0')}${darkenedRgb.b.toString(16).padStart(2, '0')}`;
  
  // If darkened version meets requirements, use it
  if (meetsContrastRequirements(darkenedHex, 'white')) {
    return darkenedHex;
  }
  
  // Otherwise, return a safe fallback
  return '#374151'; // Tailwind gray-700, good contrast with white
}
