import Dexie, { type EntityTable } from 'dexie';
import type { CatalogItem, PRLog, UserSettings } from '../types/catalog';
import { getBuiltinCatalog } from '../catalog/seed';

/**
 * CrossfitToolkit IndexedDB Database
 */
class CrossfitToolkitDB extends Dexie {
  catalogItems!: EntityTable<CatalogItem, 'id'>;
  prLogs!: EntityTable<PRLog, 'id'>;
  settings!: EntityTable<UserSettings & { id: string }, 'id'>;

  constructor() {
    super('CrossfitToolkitDB');

    this.version(1).stores({
      // Catalog items indexed by id, category, name, and favorite status
      catalogItems: 'id, category, name, isFavorite, isBuiltin',
      // PR logs indexed by id, catalogItemId, date, and variant
      prLogs: 'id, catalogItemId, date, variant',
      // Settings (singleton with id='default')
      settings: 'id',
    });
  }
}

// Database singleton
export const db = new CrossfitToolkitDB();

/**
 * Initialize database with seed data if empty
 */
export const initializeDatabase = async (): Promise<void> => {
  const count = await db.catalogItems.count();
  
  if (count === 0) {
    // Seed with builtin catalog
    const builtinItems = getBuiltinCatalog();
    await db.catalogItems.bulkAdd(builtinItems);
    console.log(`[DB] Seeded ${builtinItems.length} catalog items`);
  }

  // Ensure default settings exist
  const settings = await db.settings.get('default');
  if (!settings) {
    await db.settings.add({
      id: 'default',
      weightUnit: 'kg',
      distanceUnit: 'm',
    });
    console.log('[DB] Created default settings');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG ITEM OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all catalog items
 */
export const getAllCatalogItems = async (): Promise<CatalogItem[]> => {
  return db.catalogItems.toArray();
};

/**
 * Get catalog items by category
 */
export const getCatalogItemsByCategory = async (
  category: CatalogItem['category']
): Promise<CatalogItem[]> => {
  return db.catalogItems.where('category').equals(category).toArray();
};

/**
 * Get favorite catalog items
 */
export const getFavoriteCatalogItems = async (): Promise<CatalogItem[]> => {
  return db.catalogItems.where('isFavorite').equals(1).toArray();
};

/**
 * Get catalog item by ID
 */
export const getCatalogItemById = async (
  id: string
): Promise<CatalogItem | undefined> => {
  return db.catalogItems.get(id);
};

/**
 * Search catalog items by name
 */
export const searchCatalogItems = async (
  query: string
): Promise<CatalogItem[]> => {
  const lowerQuery = query.toLowerCase();
  return db.catalogItems
    .filter((item) => item.name.toLowerCase().includes(lowerQuery))
    .toArray();
};

/**
 * Toggle favorite status for a catalog item
 */
export const toggleFavorite = async (id: string): Promise<void> => {
  const item = await db.catalogItems.get(id);
  if (item) {
    await db.catalogItems.update(id, { isFavorite: !item.isFavorite });
  }
};

/**
 * Add a custom catalog item
 */
export const addCustomCatalogItem = async (
  item: Omit<CatalogItem, 'id' | 'isBuiltin' | 'createdAt'>
): Promise<string> => {
  const id = `custom-${Date.now()}`;
  await db.catalogItems.add({
    ...item,
    id,
    isBuiltin: false,
    createdAt: Date.now(),
  });
  return id;
};

// ═══════════════════════════════════════════════════════════════════════════
// PR LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all PR logs
 */
export const getAllPRLogs = async (): Promise<PRLog[]> => {
  return db.prLogs.orderBy('date').reverse().toArray();
};

/**
 * Get PR logs for a specific catalog item
 */
export const getPRLogsForItem = async (
  catalogItemId: string
): Promise<PRLog[]> => {
  return db.prLogs
    .where('catalogItemId')
    .equals(catalogItemId)
    .reverse()
    .sortBy('date');
};

/**
 * Get recent PR logs (last N entries)
 */
export const getRecentPRLogs = async (limit: number = 10): Promise<PRLog[]> => {
  return db.prLogs.orderBy('date').reverse().limit(limit).toArray();
};

/**
 * Get the best PR for a catalog item (by variant)
 */
export const getBestPR = async (
  catalogItemId: string,
  variant?: PRLog['variant']
): Promise<PRLog | undefined> => {
  let logs = await getPRLogsForItem(catalogItemId);
  
  if (variant !== undefined) {
    logs = logs.filter((log) => log.variant === variant);
  }

  if (logs.length === 0) return undefined;

  // Get catalog item to determine if higher or lower is better
  const item = await getCatalogItemById(catalogItemId);
  if (!item) return undefined;

  const isLowerBetter = item.scoreType === 'Time';
  
  return logs.reduce((best, current) => {
    if (isLowerBetter) {
      return current.resultValue < best.resultValue ? current : best;
    } else {
      return current.resultValue > best.resultValue ? current : best;
    }
  });
};

/**
 * Get best PRs grouped by distance (for Monostructural Time items like Run, Row)
 * Returns a map of distance (in meters) to best PR at that distance
 */
export const getBestPRsByDistance = async (
  catalogItemId: string
): Promise<Map<number, PRLog>> => {
  const logs = await getPRLogsForItem(catalogItemId);
  const bestByDistance = new Map<number, PRLog>();

  for (const log of logs) {
    if (log.distance === undefined) continue;

    const existingBest = bestByDistance.get(log.distance);
    if (!existingBest || log.resultValue < existingBest.resultValue) {
      // For Time scoreType, lower is better
      bestByDistance.set(log.distance, log);
    }
  }

  return bestByDistance;
};

/**
 * Add a new PR log
 */
export const addPRLog = async (
  log: Omit<PRLog, 'id' | 'createdAt'>
): Promise<string> => {
  const id = `log-${Date.now()}`;
  await db.prLogs.add({
    ...log,
    id,
    createdAt: Date.now(),
  });
  return id;
};

/**
 * Delete a PR log
 */
export const deletePRLog = async (id: string): Promise<void> => {
  await db.prLogs.delete(id);
};

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get user settings
 */
export const getSettings = async (): Promise<UserSettings> => {
  const settings = await db.settings.get('default');
  return settings ?? { weightUnit: 'kg', distanceUnit: 'm' };
};

/**
 * Update user settings
 */
export const updateSettings = async (
  updates: Partial<UserSettings>
): Promise<void> => {
  await db.settings.update('default', updates);
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export all data as JSON
 */
export const exportData = async (): Promise<string> => {
  const catalogItems = await db.catalogItems.toArray();
  const prLogs = await db.prLogs.toArray();
  const settings = await getSettings();

  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      catalogItems,
      prLogs,
      settings,
    },
    null,
    2
  );
};

/**
 * Import data from JSON
 */
export const importData = async (json: string): Promise<void> => {
  const data = JSON.parse(json);

  if (data.version !== 1) {
    throw new Error('Unsupported data format version');
  }

  // Clear existing data
  await db.catalogItems.clear();
  await db.prLogs.clear();

  // Import new data
  if (data.catalogItems?.length > 0) {
    await db.catalogItems.bulkAdd(data.catalogItems);
  }
  if (data.prLogs?.length > 0) {
    await db.prLogs.bulkAdd(data.prLogs);
  }
  if (data.settings) {
    await db.settings.put({ id: 'default', ...data.settings });
  }
};
