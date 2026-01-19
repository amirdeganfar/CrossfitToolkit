import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CATALOG_DIR = path.join(ROOT, 'src', 'catalog');

const ALLOWED_CATEGORIES = new Set(['Benchmark', 'Lift', 'Monostructural', 'Skill', 'Custom']);
const ALLOWED_SUBCATEGORIES = new Set([
  'Girls',
  'Heroes',
  'Open',
  'Games',
  'Notable',
  'Movement',
  'Equipment',
  'Test',
  'Other',
]);
const ALLOWED_SCORE_TYPES = new Set(['Time', 'Load', 'Reps', 'Rounds+Reps', 'Distance', 'Calories']);
const ALLOWED_METRICS = new Set(['distance', 'calories', 'distance+calories']);

/**
 * We keep the list explicit to avoid accidentally bundling legacy files.
 */
const FILES = [
  'benchmarks_girls.json',
  'benchmarks_heroes.json',
  'benchmarks_notable.json',
  'benchmarks_open.json',
  'lifts.json',
  'monostructural.json',
  'skills.json',
];

const readJson = async (fileName) => {
  const fullPath = path.join(CATALOG_DIR, fileName);
  const raw = await fs.readFile(fullPath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected a JSON array');
    }
    return parsed;
  } catch (e) {
    throw new Error(`${fileName}: ${e instanceof Error ? e.message : String(e)}`);
  }
};

const main = async () => {
  const errors = [];
  const idToSource = new Map();
  let total = 0;

  for (const fileName of FILES) {
    const items = await readJson(fileName);
    total += items.length;

    for (const [idx, item] of items.entries()) {
      const prefix = `${fileName}[${idx}]`;

      if (!item || typeof item !== 'object') {
        errors.push(`${prefix}: item must be an object`);
        continue;
      }

      const { id, name, category, subCategory, scoreType, metrics } = item;

      if (!id || typeof id !== 'string') errors.push(`${prefix}: missing/invalid id`);
      if (!name || typeof name !== 'string') errors.push(`${prefix}: missing/invalid name`);
      if (!category || typeof category !== 'string' || !ALLOWED_CATEGORIES.has(category)) {
        errors.push(`${prefix}: invalid category "${category}"`);
      }
      if (!scoreType || typeof scoreType !== 'string' || !ALLOWED_SCORE_TYPES.has(scoreType)) {
        errors.push(`${prefix}: invalid scoreType "${scoreType}"`);
      }

      if (subCategory !== undefined) {
        if (typeof subCategory !== 'string' || !ALLOWED_SUBCATEGORIES.has(subCategory)) {
          errors.push(`${prefix}: invalid subCategory "${subCategory}"`);
        }
      }

      if (metrics !== undefined) {
        if (typeof metrics !== 'string' || !ALLOWED_METRICS.has(metrics)) {
          errors.push(`${prefix}: invalid metrics "${metrics}"`);
        }
        if (category !== 'Monostructural') {
          errors.push(`${prefix}: metrics is only valid for category "Monostructural"`);
        }
      }

      if (typeof id === 'string') {
        const existing = idToSource.get(id);
        if (existing) {
          errors.push(`${prefix}: duplicate id "${id}" (already in ${existing})`);
        } else {
          idToSource.set(id, prefix);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Catalog validation failed with ${errors.length} error(s):`);
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log(`Catalog validation passed. Files=${FILES.length}, Items=${total}, UniqueIds=${idToSource.size}`);
};

await main();

