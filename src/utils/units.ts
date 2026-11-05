/**
 * Unit conversion & display helpers.
 *
 * Load results and goals store the unit they were entered in (`unit`). Display
 * always converts to the user's current settings unit — so values stay right
 * after switching kg/lb, and a suffix is printed exactly once.
 */

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'm' | 'ft';

const KG_PER_LB = 0.45359237;
const M_PER_FT = 0.3048;

/** Round to at most `decimals` places, dropping trailing zeros. */
const round = (value: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/** Convert a weight. A missing `from` unit is treated as already in `to`. */
export const convertWeight = (value: number, from: WeightUnit | undefined, to: WeightUnit): number => {
  if (!from || from === to) return value;
  return from === 'kg' ? value / KG_PER_LB : value * KG_PER_LB;
};

/** Convert a distance. A missing `from` unit is treated as already in `to`. */
export const convertDistance = (value: number, from: DistanceUnit | undefined, to: DistanceUnit): number => {
  if (!from || from === to) return value;
  return from === 'm' ? value / M_PER_FT : value * M_PER_FT;
};

/** Format a weight in the display unit, e.g. `formatWeight(100, 'kg', 'lb')` → "220.5lb". */
export const formatWeight = (
  value: number,
  fromUnit: WeightUnit | undefined,
  toUnit: WeightUnit,
  decimals = 1
): string => `${round(convertWeight(value, fromUnit, toUnit), decimals)}${toUnit}`;

/** Format a distance in the display unit, e.g. `formatDistance(400, 'm', 'ft')` → "1312ft". */
export const formatDistance = (
  value: number,
  fromUnit: DistanceUnit | undefined,
  toUnit: DistanceUnit,
  decimals = 0
): string => `${round(convertDistance(value, fromUnit, toUnit), decimals)}${toUnit}`;

/**
 * Split a formatted display string into its numeric part and a trailing unit
 * suffix so the unit can be rendered smaller, e.g. "100kg" → { value: "100",
 * unit: "kg" }, "50 cal" → { value: "50", unit: "cal" }. Strings that don't end
 * in a letter suffix after a digit ("3:45", "5 rounds + 3") return unit "".
 */
export const splitUnit = (text: string): { value: string; unit: string } => {
  const match = /^(.*\d)\s*([a-zA-Z]+)$/.exec(text.trim());
  if (!match) return { value: text, unit: '' };
  return { value: match[1], unit: match[2] };
};

/**
 * Format a distance stored in meters (PRLog.distance / Goal.distance) for
 * display, e.g. 400 → "400m", 5000 → "5km"; with 'ft' converts → "1312ft".
 */
export const formatMeters = (meters: number, toUnit: DistanceUnit = 'm'): string => {
  if (toUnit === 'ft') return formatDistance(meters, 'm', 'ft');
  if (meters >= 1000 && meters % 1000 === 0) return `${meters / 1000}km`;
  return `${round(meters, 0)}m`;
};
