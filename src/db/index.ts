import Dexie, { type EntityTable } from 'dexie';
import type { CatalogItem, PRLog, UserSettings, Favorite, CustomItem } from '../types/catalog';
import type { Goal, CreateGoalInput, UpdateGoalInput, GoalStatus } from '../types/goal';
import type { DailyCheckIn } from '../types/training';
import { getBuiltinCatalog, getBuiltinCatalogItemById } from '../catalog/catalogService';

/**
 * CrossfitToolkit IndexedDB Database
 * 
 * Schema v2: Catalog items moved to static JSON file.
 * Schema v3: Added goals table for Goal Setting & Tracking feature.
 * Schema v4: Added dailyCheckIns table for Recovery Insights feature.
 * DB now only stores user data: favorites, custom items, PR logs, settings, goals, check-ins.
 */
class CrossfitToolkitDB extends Dexie {
  favorites!: EntityTable<Favorite, 'id'>;
  customItems!: EntityTable<CustomItem, 'id'>;
  prLogs!: EntityTable<PRLog, 'id'>;
  settings!: EntityTable<UserSettings & { id: string }, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  dailyCheckIns!: EntityTable<DailyCheckIn, 'id'>;

  constructor() {
    super('CrossfitToolkitDB');

    // Version 1: Original schema with catalogItems (deprecated)
    this.version(1).stores({
      catalogItems: 'id, category, name, isFavorite, isBuiltin',
      prLogs: 'id, catalogItemId, date, variant',
      settings: 'id',
    });

    // Version 2: Catalog items moved to JSON, DB stores only user data
    this.version(2)
      .stores({
        // Remove catalogItems table (set to null)
        catalogItems: null,
        // New tables for user data
        favorites: 'id',
        customItems: 'id, category, name',
        prLogs: 'id, catalogItemId, date, variant',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        console.log('[DB] Migrating from v1 to v2...');
        
        // Get old catalogItems table
        const oldCatalogItems = tx.table('catalogItems');
        const allItems = await oldCatalogItems.toArray();
        
        // Extract favorites (items where isFavorite is true)
        const favoriteIds = allItems
          .filter((item: CatalogItem) => item.isFavorite)
          .map((item: CatalogItem) => ({ id: item.id }));
        
        if (favoriteIds.length > 0) {
          await tx.table('favorites').bulkAdd(favoriteIds);
          console.log(`[DB] Migrated ${favoriteIds.length} favorites`);
        }
        
        // Extract custom items (non-builtin items)
        const customItems = allItems
          .filter((item: CatalogItem) => !item.isBuiltin)
          .map((item: CatalogItem) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            subCategory: item.subCategory,
            tags: item.tags,
            scoreType: item.scoreType,
            description: item.description,
            aliases: item.aliases,
            source: item.source,
            sourceUrl: item.sourceUrl,
            createdAt: item.createdAt,
            metrics: item.metrics,
          }));
        
        if (customItems.length > 0) {
          await tx.table('customItems').bulkAdd(customItems);
          console.log(`[DB] Migrated ${customItems.length} custom items`);
        }
        
        console.log('[DB] Migration complete');
      });

    // Version 3: Added goals table for Goal Setting & Tracking
    this.version(3).stores({
      favorites: 'id',
      customItems: 'id, category, name',
      prLogs: 'id, catalogItemId, date, variant',
      settings: 'id',
      goals: '++id, itemId, status, targetDate',
    });

    // Version 4: Added dailyCheckIns table for Recovery Insights
    this.version(4).stores({
      favorites: 'id',
      customItems: 'id, category, name',
      prLogs: 'id, catalogItemId, date, variant',
      settings: 'id',
      goals: '++id, itemId, status, targetDate',
      dailyCheckIns: 'id, date, type',
    });
  }
}

// Database singleton
export const db = new CrossfitToolkitDB();

/**
 * Initialize database
 */
export const initializeDatabase = async (): Promise<void> => {
  // Ensure default settings exist
  const settings = await db.settings.get('default');
  if (!settings) {
    await db.settings.add({
      id: 'default',
      weightUnit: 'kg',
      distanceUnit: 'm',
      hasSeenOnboarding: false,
      minSleepHours: 7,
    });
    console.log('[DB] Created default settings');
  }
  
  console.log('[DB] Initialized');
};

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG ITEM OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all catalog items (builtin + custom, with favorites applied)
 */
export const getAllCatalogItems = async (): Promise<CatalogItem[]> => {
  // Get favorites and custom items from DB
  const [favorites, customItems] = await Promise.all([
    db.favorites.toArray(),
    db.customItems.toArray(),
  ]);
  
  const favoriteIds = new Set(favorites.map((f) => f.id));
  
  // Get builtin items from catalog service and apply favorites
  const builtinItems = getBuiltinCatalog().map((item) => ({
    ...item,
    isFavorite: favoriteIds.has(item.id),
  }));
  
  // Convert custom items to CatalogItem format
  const customCatalogItems: CatalogItem[] = customItems.map((item) => ({
    ...item,
    isBuiltin: false,
    isFavorite: favoriteIds.has(item.id),
  }));
  
  return [...builtinItems, ...customCatalogItems];
};

/**
 * Get catalog items by category
 */
export const getCatalogItemsByCategory = async (
  category: CatalogItem['category']
): Promise<CatalogItem[]> => {
  const allItems = await getAllCatalogItems();
  return allItems.filter((item) => item.category === category);
};

/**
 * Get favorite catalog items
 */
export const getFavoriteCatalogItems = async (): Promise<CatalogItem[]> => {
  const allItems = await getAllCatalogItems();
  return allItems.filter((item) => item.isFavorite);
};

/**
 * Get catalog item by ID
 */
export const getCatalogItemById = async (
  id: string
): Promise<CatalogItem | undefined> => {
  // Check builtin catalog first
  const builtinItem = getBuiltinCatalogItemById(id);
  if (builtinItem) {
    const favorite = await db.favorites.get(id);
    return {
      ...builtinItem,
      isFavorite: !!favorite,
    };
  }
  
  // Check custom items
  const customItem = await db.customItems.get(id);
  if (customItem) {
    const favorite = await db.favorites.get(id);
    return {
      ...customItem,
      isBuiltin: false,
      isFavorite: !!favorite,
    };
  }
  
  return undefined;
};

/**
 * Search catalog items by name
 */
export const searchCatalogItems = async (
  query: string
): Promise<CatalogItem[]> => {
  const lowerQuery = query.toLowerCase();
  const allItems = await getAllCatalogItems();
  return allItems.filter((item) => 
    item.name.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Toggle favorite status for a catalog item
 */
export const toggleFavorite = async (id: string): Promise<void> => {
  const existing = await db.favorites.get(id);
  if (existing) {
    await db.favorites.delete(id);
  } else {
    await db.favorites.add({ id });
  }
};

/**
 * Add a custom catalog item
 */
export const addCustomCatalogItem = async (
  item: Omit<CatalogItem, 'id' | 'isBuiltin' | 'isFavorite' | 'createdAt'>
): Promise<string> => {
  const id = `custom-${Date.now()}`;
  await db.customItems.add({
    ...item,
    id,
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
 * Get best PRs grouped by time (for Monostructural Time items like Assault Bike)
 * Returns a map of time (resultValue in seconds) to best PR at that time (highest calories)
 */
export const getBestPRsByCalories = async (
  catalogItemId: string
): Promise<Map<number, PRLog>> => {
  const logs = await getPRLogsForItem(catalogItemId);
  const bestByTime = new Map<number, PRLog>();

  for (const log of logs) {
    if (log.calories === undefined) continue;

    // Group by time (resultValue), find MAX calories for each time
    const existingBest = bestByTime.get(log.resultValue);
    if (!existingBest || existingBest.calories === undefined || log.calories > existingBest.calories) {
      // For calories, higher is better (max calories in given time)
      bestByTime.set(log.resultValue, log);
    }
  }

  return bestByTime;
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
  return settings ?? { weightUnit: 'kg', distanceUnit: 'm', hasSeenOnboarding: false, minSleepHours: 7 };
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
 * Export all user data as JSON
 */
export const exportData = async (): Promise<string> => {
  const [favorites, customItems, prLogs, goals, dailyCheckIns, settings] = await Promise.all([
    db.favorites.toArray(),
    db.customItems.toArray(),
    db.prLogs.toArray(),
    db.goals.toArray(),
    db.dailyCheckIns.toArray(),
    getSettings(),
  ]);

  return JSON.stringify(
    {
      version: 4,
      exportedAt: new Date().toISOString(),
      favorites,
      customItems,
      prLogs,
      goals,
      dailyCheckIns,
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

  // Handle v1 format (legacy)
  if (data.version === 1) {
    await importV1Data(data);
    return;
  }

  // Handle v2 format (no goals)
  if (data.version === 2) {
    await importV2Data(data);
    return;
  }

  // Handle v3 format (no dailyCheckIns)
  if (data.version === 3) {
    await importV3Data(data);
    return;
  }

  if (data.version !== 4) {
    throw new Error('Unsupported data format version');
  }

  // Clear existing user data
  await Promise.all([
    db.favorites.clear(),
    db.customItems.clear(),
    db.prLogs.clear(),
    db.goals.clear(),
    db.dailyCheckIns.clear(),
  ]);

  // Import new data
  if (data.favorites?.length > 0) {
    await db.favorites.bulkAdd(data.favorites);
  }
  if (data.customItems?.length > 0) {
    await db.customItems.bulkAdd(data.customItems);
  }
  if (data.prLogs?.length > 0) {
    await db.prLogs.bulkAdd(data.prLogs);
  }
  if (data.goals?.length > 0) {
    await db.goals.bulkAdd(data.goals);
  }
  if (data.dailyCheckIns?.length > 0) {
    await db.dailyCheckIns.bulkAdd(data.dailyCheckIns);
  }
  if (data.settings) {
    await db.settings.put({ id: 'default', ...data.settings });
  }
};

/**
 * Import v3 data format (no dailyCheckIns)
 */
const importV3Data = async (data: {
  favorites?: { id: string }[];
  customItems?: CustomItem[];
  prLogs?: PRLog[];
  goals?: Goal[];
  settings?: UserSettings;
}): Promise<void> => {
  // Clear existing user data
  await Promise.all([
    db.favorites.clear(),
    db.customItems.clear(),
    db.prLogs.clear(),
    db.goals.clear(),
  ]);

  if (data.favorites?.length) {
    await db.favorites.bulkAdd(data.favorites);
  }
  if (data.customItems?.length) {
    await db.customItems.bulkAdd(data.customItems);
  }
  if (data.prLogs?.length) {
    await db.prLogs.bulkAdd(data.prLogs);
  }
  if (data.goals?.length) {
    await db.goals.bulkAdd(data.goals);
  }
  if (data.settings) {
    await db.settings.put({ id: 'default', ...data.settings });
  }
};

/**
 * Import v2 data format (no goals)
 */
const importV2Data = async (data: {
  favorites?: { id: string }[];
  customItems?: CustomItem[];
  prLogs?: PRLog[];
  settings?: UserSettings;
}): Promise<void> => {
  // Clear existing user data
  await Promise.all([
    db.favorites.clear(),
    db.customItems.clear(),
    db.prLogs.clear(),
  ]);

  if (data.favorites?.length) {
    await db.favorites.bulkAdd(data.favorites);
  }
  if (data.customItems?.length) {
    await db.customItems.bulkAdd(data.customItems);
  }
  if (data.prLogs?.length) {
    await db.prLogs.bulkAdd(data.prLogs);
  }
  if (data.settings) {
    await db.settings.put({ id: 'default', ...data.settings });
  }
};

/**
 * Import legacy v1 data format
 */
const importV1Data = async (data: {
  catalogItems?: CatalogItem[];
  prLogs?: PRLog[];
  settings?: UserSettings;
}): Promise<void> => {
  // Clear existing user data
  await Promise.all([
    db.favorites.clear(),
    db.customItems.clear(),
    db.prLogs.clear(),
  ]);

  if (data.catalogItems?.length) {
    // Extract favorites
    const favorites = data.catalogItems
      .filter((item) => item.isFavorite)
      .map((item) => ({ id: item.id }));
    
    if (favorites.length > 0) {
      await db.favorites.bulkAdd(favorites);
    }

    // Extract custom items
    const customItems = data.catalogItems
      .filter((item) => !item.isBuiltin)
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        subCategory: item.subCategory,
        tags: item.tags,
        scoreType: item.scoreType,
        description: item.description,
        aliases: item.aliases,
        source: item.source,
        sourceUrl: item.sourceUrl,
        createdAt: item.createdAt,
        metrics: item.metrics,
      }));
    
    if (customItems.length > 0) {
      await db.customItems.bulkAdd(customItems);
    }
  }

  if (data.prLogs?.length) {
    await db.prLogs.bulkAdd(data.prLogs);
  }

  if (data.settings) {
    await db.settings.put({ id: 'default', ...data.settings });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GOAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all goals
 */
export const getAllGoals = async (): Promise<Goal[]> => {
  return db.goals.toArray();
};

/**
 * Get goals by status
 */
export const getGoalsByStatus = async (status: GoalStatus): Promise<Goal[]> => {
  return db.goals.where('status').equals(status).toArray();
};

/**
 * Get active goals
 */
export const getActiveGoals = async (): Promise<Goal[]> => {
  return getGoalsByStatus('active');
};

/**
 * Get goal by ID
 */
export const getGoalById = async (id: string): Promise<Goal | undefined> => {
  return db.goals.get(id);
};

/**
 * Get active goal for a specific item
 */
export const getActiveGoalForItem = async (
  itemId: string,
  variant?: Goal['variant'],
  reps?: number
): Promise<Goal | undefined> => {
  const activeGoals = await db.goals
    .where('itemId')
    .equals(itemId)
    .and((goal) => goal.status === 'active')
    .toArray();

  // Find goal matching variant and reps if specified
  return activeGoals.find((goal) => {
    const variantMatch = variant === undefined || goal.variant === variant;
    const repsMatch = reps === undefined || goal.reps === reps;
    return variantMatch && repsMatch;
  });
};

/**
 * Get all goals for a specific item
 */
export const getGoalsForItem = async (itemId: string): Promise<Goal[]> => {
  return db.goals.where('itemId').equals(itemId).toArray();
};

/**
 * Add a new goal
 */
export const addGoal = async (input: CreateGoalInput): Promise<string> => {
  const id = `goal-${Date.now()}`;
  const now = new Date().toISOString().split('T')[0];
  
  await db.goals.add({
    id,
    itemId: input.itemId,
    targetValue: input.targetValue,
    targetDate: input.targetDate,
    createdAt: now,
    status: 'active',
    variant: input.variant,
    reps: input.reps,
  });
  
  return id;
};

/**
 * Update an existing goal
 */
export const updateGoal = async (
  id: string,
  updates: UpdateGoalInput
): Promise<void> => {
  await db.goals.update(id, updates);
};

/**
 * Mark a goal as achieved
 */
export const achieveGoal = async (id: string): Promise<void> => {
  const now = new Date().toISOString().split('T')[0];
  await db.goals.update(id, {
    status: 'achieved',
    achievedAt: now,
  });
};

/**
 * Cancel a goal
 */
export const cancelGoal = async (id: string): Promise<void> => {
  await db.goals.update(id, { status: 'cancelled' });
};

/**
 * Delete a goal
 */
export const deleteGoal = async (id: string): Promise<void> => {
  await db.goals.delete(id);
};
