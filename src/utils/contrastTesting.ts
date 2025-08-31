/**
 * Color Contrast Testing Utilities
 * 
 * This file provides utilities to test and demonstrate the color contrast improvements
 * for the StatCard component icons.
 */

import { getAccessibleTextClasses, getAccessibleColorVariant, meetsContrastRequirements, isLightColor } from './colorUtils.ts';

// Common colors used in StatCards
export const STAT_CARD_COLORS = {
  blue: '#3b82f6',
  green: '#10b981', 
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  gray: '#6b7280'
} as const;

/**
 * Test contrast for all StatCard colors
 */
export function testStatCardContrast(): void {
  if (import.meta.env.DEV) {
    console.group('🎨 StatCard Color Contrast Analysis');
    
    Object.entries(STAT_CARD_COLORS).forEach(([name, color]) => {
      const meetsStandard = meetsContrastRequirements(color, 'white');
      const isLight = isLightColor(color);
      const accessibleVariant = getAccessibleColorVariant(color);
      const textClasses = getAccessibleTextClasses(color);
      
      console.log(`${name.toUpperCase()} (${color}):`);
      console.log(`  ✓ Meets WCAG AA: ${meetsStandard ? '✅' : '❌'}`);
      console.log(`  ✓ Is light color: ${isLight ? '☀️' : '🌙'}`);
      console.log(`  ✓ Recommended text: ${textClasses}`);
      console.log(`  ✓ Accessible variant: ${accessibleVariant}`);
      console.log('');
    });
    
    console.groupEnd();
  }
}

/**
 * Generate contrast examples for documentation
 */
export function generateContrastExamples(): Array<{
  name: string;
  original: string;
  accessible: string;
  meetsOriginal: boolean;
  meetsAccessible: boolean;
  textColor: string;
}> {
  return Object.entries(STAT_CARD_COLORS).map(([name, original]) => ({
    name,
    original,
    accessible: getAccessibleColorVariant(original),
    meetsOriginal: meetsContrastRequirements(original, 'white'),
    meetsAccessible: meetsContrastRequirements(getAccessibleColorVariant(original), 'white'),
    textColor: getAccessibleTextClasses(original)
  }));
}

// Auto-run test in development
if (import.meta.env.DEV) {
  // Delay to avoid cluttering initial console output
  setTimeout(testStatCardContrast, 2000);
}
