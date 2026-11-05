import { describe, expect, it } from 'vitest';
import type { CatalogItem } from '../types/catalog';
import { getLogScoreType, getScoreModes, isLowerBetter, SCORE_TYPES } from './scoreTypes';

const makeItem = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id: 'item-1',
  name: 'Test Item',
  category: 'Skill',
  scoreType: 'Reps',
  isBuiltin: true,
  isFavorite: false,
  createdAt: 0,
  ...overrides,
});

describe('Time score type', () => {
  const time = SCORE_TYPES.Time;

  it.each(['4:32', '0:45', '12:00', '1:05:30'])('accepts "%s"', (input) => {
    expect(time.validate(input)).toBe(true);
  });

  it.each(['4:75', '1:65:00', '1:05:60', '4', '4:5', 'abc', '', '-1:00'])('rejects "%s"', (input) => {
    expect(time.validate(input)).toBe(false);
  });

  it('parses m:ss to seconds', () => {
    expect(time.parse('4:32')).toBe(272);
  });

  it('parses h:mm:ss to seconds', () => {
    expect(time.parse('1:05:30')).toBe(3930);
  });

  it('is lower-is-better', () => {
    expect(isLowerBetter('Time')).toBe(true);
    expect(isLowerBetter('TimeForReps')).toBe(true);
  });
});

describe('Rounds+Reps score type', () => {
  const roundsReps = SCORE_TYPES['Rounds+Reps'];

  it('parses "18+5" so rounds outrank reps', () => {
    expect(roundsReps.parse('18+5')).toBe(1805);
    expect(roundsReps.parse('19+0')).toBeGreaterThan(roundsReps.parse('18+99'));
  });

  it('parses a bare "18" as 18 full rounds', () => {
    expect(roundsReps.parse('18')).toBe(roundsReps.parse('18+0'));
  });

  it('formats a bare "18" as "18+0"', () => {
    expect(roundsReps.format('18')).toBe('18+0');
  });

  it.each(['18', '18+5', '0+12'])('accepts "%s"', (input) => {
    expect(roundsReps.validate(input)).toBe(true);
  });

  it.each(['18+', '+5', '18 + 5', 'abc', ''])('rejects "%s"', (input) => {
    expect(roundsReps.validate(input)).toBe(false);
  });
});

describe('Load score type', () => {
  const load = SCORE_TYPES.Load;

  it('parses decimal weights', () => {
    expect(load.parse('102.5')).toBe(102.5);
  });

  it.each(['100', '102.5'])('accepts "%s"', (input) => {
    expect(load.validate(input)).toBe(true);
  });

  it.each(['100kg', '-5', '1e3', '.5', ''])('rejects "%s"', (input) => {
    expect(load.validate(input)).toBe(false);
  });

  it('formats with the given unit, defaulting to kg', () => {
    expect(load.format('100', 'lb')).toBe('100lb');
    expect(load.format('100')).toBe('100kg');
  });

  it('is higher-is-better', () => {
    expect(isLowerBetter('Load')).toBe(false);
  });
});

describe('numeric score types', () => {
  it.each(['Reps', 'Distance', 'Calories', 'RepsInTime'] as const)('%s rejects non-numeric input', (type) => {
    expect(SCORE_TYPES[type].validate('12a')).toBe(false);
    expect(SCORE_TYPES[type].validate('12')).toBe(true);
  });

  it('TimeForReps validates like Time', () => {
    expect(SCORE_TYPES.TimeForReps.validate('0:45')).toBe(true);
    expect(SCORE_TYPES.TimeForReps.validate('0:75')).toBe(false);
  });
});

describe('getScoreModes', () => {
  it('returns only the primary type for a single-mode item', () => {
    expect(getScoreModes(makeItem({ scoreType: 'Load' }))).toEqual(['Load']);
  });

  it('prepends the primary type when the declared modes omit it', () => {
    const item = makeItem({ scoreType: 'Reps', scoreTypeIds: ['TimeForReps', 'RepsInTime'] });

    expect(getScoreModes(item)).toEqual(['Reps', 'TimeForReps', 'RepsInTime']);
  });

  it('drops duplicate modes keeping declared order', () => {
    const item = makeItem({ scoreType: 'Reps', scoreTypeIds: ['RepsInTime', 'Reps', 'RepsInTime'] });

    expect(getScoreModes(item)).toEqual(['RepsInTime', 'Reps']);
  });

  it('returns no modes for a missing item', () => {
    expect(getScoreModes(null)).toEqual([]);
  });
});

describe('getLogScoreType', () => {
  it("backfills a legacy log to the item's primary type", () => {
    expect(getLogScoreType({}, { scoreType: 'Reps' })).toBe('Reps');
  });

  it("uses the log's own score type when set", () => {
    expect(getLogScoreType({ scoreTypeId: 'TimeForReps' }, { scoreType: 'Reps' })).toBe('TimeForReps');
  });
});
