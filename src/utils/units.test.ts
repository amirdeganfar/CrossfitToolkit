import { describe, expect, it } from 'vitest';
import { convertDistance, convertWeight, formatDistance, formatMeters, formatWeight, splitUnit } from './units';

const countOf = (text: string, suffix: string) => text.split(suffix).length - 1;

describe('convertWeight', () => {
  it('converts kg to lb', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.462, 3);
  });

  it('converts lb to kg', () => {
    expect(convertWeight(225, 'lb', 'kg')).toBeCloseTo(102.058, 3);
  });

  it('returns the value unchanged when units match', () => {
    expect(convertWeight(100, 'kg', 'kg')).toBe(100);
  });

  it('treats a missing source unit as already in the target unit', () => {
    expect(convertWeight(100, undefined, 'lb')).toBe(100);
  });

  it('round-trips kg → lb → kg', () => {
    expect(convertWeight(convertWeight(100, 'kg', 'lb'), 'lb', 'kg')).toBeCloseTo(100, 9);
  });
});

describe('convertDistance', () => {
  it('converts m to ft', () => {
    expect(convertDistance(400, 'm', 'ft')).toBeCloseTo(1312.336, 3);
  });

  it('converts ft to m', () => {
    expect(convertDistance(1000, 'ft', 'm')).toBeCloseTo(304.8, 6);
  });

  it('treats a missing source unit as already in the target unit', () => {
    expect(convertDistance(400, undefined, 'ft')).toBe(400);
  });
});

describe('formatWeight', () => {
  it('converts and rounds to one decimal with a single suffix', () => {
    const result = formatWeight(100, 'kg', 'lb');

    expect(result).toBe('220.5lb');
    expect(countOf(result, 'lb')).toBe(1);
  });

  it('drops trailing zeros', () => {
    expect(formatWeight(100, 'kg', 'kg')).toBe('100kg');
  });

  it('formats a unit-less value in the target unit without converting', () => {
    expect(formatWeight(100, undefined, 'lb')).toBe('100lb');
  });
});

describe('formatDistance', () => {
  it('converts and rounds to whole units by default', () => {
    expect(formatDistance(400, 'm', 'ft')).toBe('1312ft');
  });

  it('honours a custom decimals argument', () => {
    expect(formatDistance(400, 'm', 'ft', 1)).toBe('1312.3ft');
  });
});

describe('formatMeters', () => {
  it('shows whole kilometres as km', () => {
    expect(formatMeters(5000)).toBe('5km');
  });

  it('shows non-whole kilometres in metres', () => {
    expect(formatMeters(1500)).toBe('1500m');
  });

  it('shows short distances in metres', () => {
    expect(formatMeters(400)).toBe('400m');
  });

  it('converts to feet with a single suffix', () => {
    const result = formatMeters(400, 'ft');

    expect(result).toBe('1312ft');
    expect(countOf(result, 'ft')).toBe(1);
  });
});

describe('splitUnit', () => {
  it.each([
    ['100kg', { prefix: '', value: '100', unit: 'kg' }],
    ['220.5lb', { prefix: '', value: '220.5', unit: 'lb' }],
    ['50 cal', { prefix: '', value: '50', unit: 'cal' }],
    ['5km', { prefix: '', value: '5', unit: 'km' }],
  ])('splits "%s" into value and unit', (text, expected) => {
    expect(splitUnit(text)).toEqual(expected);
  });

  it.each(['3:45', '5 rounds + 3', '18+5'])('returns no unit for "%s"', (text) => {
    expect(splitUnit(text)).toEqual({ prefix: '', value: text, unit: '' });
  });

  it('splits a compound "<label> @ <value>" into prefix, value and unit', () => {
    expect(splitUnit('5 reps @ 100kg')).toEqual({ prefix: '5 reps @', value: '100', unit: 'kg' });
  });

  it('keeps the prefix when the compound value has no unit', () => {
    expect(splitUnit('400m @ 1:30')).toEqual({ prefix: '400m @', value: '1:30', unit: '' });
  });
});
