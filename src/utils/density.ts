import type { RowDensity } from '../types/index.ts';

/** Every row density, in the order Settings shows them */
export const ROW_DENSITIES: readonly RowDensity[] = ['compact', 'comfortable', 'minimal'];

/**
 * Turns a saved value into a density. Anything that is not a known density (an old file, a hand-edited backup,
 * a value from a newer version of the app) becomes the default, so a bad value can never reach the page.
 */
export function parseRowDensity(value: unknown): RowDensity {
  return ROW_DENSITIES.find((density) => density === value) ?? 'compact';
}
