import { formatDate, todayInKolkata } from './dates';
import { formatMeasurement, fromInches, parseNumber, toInches } from './units';

describe('units (TESTING.md ME2)', () => {
  it('ME2: 101.6 cm is stored as 40.00 in', () => {
    expect(toInches(101.6, 'cm')).toBe(40);
    expect(toInches(40.5, 'in')).toBe(40.5);
    expect(toInches(100, 'cm')).toBe(39.37);
  });

  it('shows the same value converted: inches ↔ cm', () => {
    expect(fromInches(40, 'cm')).toBe(101.6);
    expect(fromInches(17.5, 'in')).toBe(17.5);
    expect(formatMeasurement(40, 'in')).toBe('40');
    expect(formatMeasurement(40.5, 'cm')).toBe('102.9');
  });

  it('round-trips an inch value through cm without drifting more than a rounding step', () => {
    for (const inches of [9.5, 15.5, 29, 36, 40.25, 999.99]) {
      const typedCm = fromInches(inches, 'cm');
      expect(Math.abs(toInches(typedCm, 'cm') - inches)).toBeLessThanOrEqual(0.05);
    }
  });

  it('parses typed numbers, accepting a decimal comma', () => {
    expect(parseNumber('40.5')).toBe(40.5);
    expect(parseNumber('40,5')).toBe(40.5);
    expect(parseNumber(' 7 ')).toBe(7);
    expect(parseNumber('.5')).toBe(0.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1.2.3')).toBeNull();
    expect(parseNumber('-4')).toBeNull();
  });
});

describe('dates', () => {
  it('IST date flips at 18:30 UTC (H3 time-zone edge)', () => {
    expect(todayInKolkata(new Date('2026-11-01T18:29:00Z'))).toBe('2026-11-01');
    expect(todayInKolkata(new Date('2026-11-01T18:30:00Z'))).toBe('2026-11-02');
  });

  it('formats with Latin digits', () => {
    expect(formatDate('2026-11-02')).toBe('2 Nov 2026');
    expect(formatDate('nonsense')).toBe('nonsense');
  });
});
