import { describe, expect, it } from 'vitest';
import { parseRowDensity, ROW_DENSITIES } from './density.ts';

describe('parseRowDensity', () => {
  it('keeps every known density', () => {
    for (const density of ROW_DENSITIES) expect(parseRowDensity(density)).toBe(density);
    expect(ROW_DENSITIES).toContain('minimal');
  });

  it('falls back to compact for anything else', () => {
    for (const value of [undefined, null, '', 'huge', 'Minimal', 3, {}, ['minimal']]) {
      expect(parseRowDensity(value)).toBe('compact');
    }
  });
});
