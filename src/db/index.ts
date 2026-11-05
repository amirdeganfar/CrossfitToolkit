import Dexie, { type EntityTable } from 'dexie';
import type { CatalogItem, PRLog, UserSettings, Favorite, CustomItem, ScoreType } from '../types/catalog';
import type { Goal, CreateGoalInput, UpdateGoalInput, GoalStatus } from '../types/goal';
import type { DailyCheckIn } from '../types/training';
import { getBuiltinCatalog, getBuiltinCatalogItemById } from '../catalog/catalogService';
import { isLowerBetter as scoreTypeIsLowerBetter, getLogScoreType } from '../config/scoreTypes';
import { todayLocal } from '../utils/date';

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

    // Version 5: logs & goals store the unit they were entered in. Same schema;
    // stamp existing rows with the current settings units.
    this.version(5)
      .stores({
        favorites: 'id',
        customItems: 'id, category, name',
        prLogs: 'id, catalogItemId, date, variant',
        settings: 'id',
        goals: '++id, itemId, status, targetDate',
        dailyCheckIns: 'id, date, type',
      })
      .upgrade(async (tx) => {
        const stored = (await tx.table('settings').get('default')) as UserSettings | undefined;
        const units = { ...DEFAULT_SETTINGS, ...stored };
        const customItems = (await tx.table('customItems').toArray()) as CustomItem[];
        const customById = new Map(customItems.map((i) => [i.id, i]));
        await tx.table('prLogs').toCollection().modify((log: PRLog) => {
          Object.assign(log, stampLogUnits(log, units));
          // Bare-integer Rounds+Reps results ("18") used to parse as 0+18; they mean 18+0.
          const item = getBuiltinCatalogItemById(log.catalogItemId) ?? customById.get(log.catalogItemId);
          if (item && getLogScoreType(log, item) === 'Rounds+Reps' && /^\d+$/.test(log.result)) {
            log.resultValue = parseInt(log.result, 10) * 100;
          }
        });
        await tx.table('goals').toCollection().modify((goal: Goal) => {
          Object.assign(goal, stampGoalUnits(goal, units));
        });
      });
  }
}

/** Default user settings (fresh install / after clearAllData). */
export const DEFAULT_SETTINGS: UserSettings = {
  weightUnit: 'kg',
  distanceUnit: 'm',
  hasSeenOnboarding: false,
  minSleepHours: 7,
};

type UnitSettings = Pick<UserSettings, 'weightUnit' | 'distanceUnit'>;

/** Fill in missing unit fields on a log from the given settings. */
const stampLogUnits = <T extends Pick<PRLog, 'unit' | 'distanceUnit'>>(log: T, units: UnitSettings): T => ({
  ...log,
  unit: log.unit ?? units.weightUnit,
  distanceUnit: log.distanceUnit ?? units.distanceUnit,
});

/** Fill in missing unit fields on a goal from the given settings. */
const stampGoalUnits = <T extends Pick<Goal, 'unit' | 'distanceUnit'>>(goal: T, units: UnitSettings): T => ({
  ...goal,
  unit: goal.unit ?? units.weightUnit,
  distanceUnit: goal.distanceUnit ?? units.distanceUnit,
});

// Database singleton
export const db = new CrossfitToolkitDB();

/** Every table holding user data (used for import / clear-all transactions). */
const USER_TABLES = () => [
  db.favorites,
  db.customItems,
  db.prLogs,
  db.goals,
  db.dailyCheckIns,
  db.settings,
];

/**
 * Initialize database
 */
export const initializeDatabase = async (): Promise<void> => {
  // Ensure default settings exist
  const settings = await db.settings.get('default');
  if (!settings) {
    // `put` (not `add`) keeps this idempotent: React StrictMode double-invokes
    // initialize() in dev, racing two inserts of the same key — `add` would
    // throw a ConstraintError on the second. `put` is a safe no-op overwrite.
    await db.settings.put({ id: 'default', ...DEFAULT_SETTINGS });
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
  // Read + write in one transaction, and `put` instead of `add`, so rapid
  // double-taps can't race into a ConstraintError.
  await db.transaction('rw', db.favorites, async () => {
    const existing = await db.favorites.get(id);
    if (existing) {
      await db.favorites.delete(id);
    } else {
      await db.favorites.put({ id });
    }
  });
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
  const logs = await db.prLogs
    .where('catalogItemId')
    .equals(catalogItemId)
    .toArray();
  return logs.sort((a, b) => b.date - a.date);
};

/**
 * Get recent PR logs (last N entries)
 */
export const getRecentPRLogs = async (limit: number = 10): Promise<PRLog[]> => {
  return db.prLogs.orderBy('date').reverse().limit(limit).toArray();
};

/**
 * Get the best PR for a catalog item (by variant).
 *
 * For multi-mode items, pass `opts.scoreTypeId` (and, where relevant, the
 * constraint `timeCap`/`targetReps`) to isolate a single score pool — otherwise
 * best is computed across all logs using the item's primary score type, which is
 * only meaningful for single-mode items.
 */
export const getBestPR = async (
  catalogItemId: string,
  variant?: PRLog['variant'],
  opts?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number }
): Promise<PRLog | undefined> => {
  let logs = await getPRLogsForItem(catalogItemId);

  if (variant !== undefined) {
    logs = logs.filter((log) => log.variant === variant);
  }

  if (logs.length === 0) return undefined;

  // Get catalog item to determine if higher or lower is better
  const item = await getCatalogItemById(catalogItemId);
  if (!item) return undefined;

  // Restrict to a single score pool when a score type is requested.
  const scoreType = opts?.scoreTypeId ?? item.scoreType;
  if (opts?.scoreTypeId) {
    logs = logs.filter((log) => getLogScoreType(log, item) === opts.scoreTypeId);
    if (opts.timeCap !== undefined) logs = logs.filter((log) => log.timeCap === opts.timeCap);
    if (opts.targetReps !== undefined) logs = logs.filter((log) => log.targetReps === opts.targetReps);
    if (logs.length === 0) return undefined;
  }

  const isLowerBetter = scoreTypeIsLowerBetter(scoreType);

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
  // Stamp the entry unit at save time (callers may pass it explicitly).
  const settings = await getSettings();
  await db.prLogs.add({
    ...stampLogUnits(log, settings),
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
  if (!settings) return { ...DEFAULT_SETTINGS };
  // Strip the internal row id and backfill any fields missing from older rows.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = settings;
  return { ...DEFAULT_SETTINGS, ...rest };
};

/**
 * Update user settings (upsert: works even if the settings row doesn't exist yet,
 * e.g. a fresh install opening /onboarding directly).
 */
export const updateSettings = async (
  updates: Partial<UserSettings>
): Promise<void> => {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    await db.settings.put({ id: 'default', ...current, ...updates });
  });
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

interface BackupPayload {
  favorites: Favorite[];
  customItems: CustomItem[];
  prLogs: PRLog[];
  goals: Goal[];
  dailyCheckIns: DailyCheckIn[];
  settings?: Partial<UserSettings>;
}

/** Map a legacy v1 catalog item to the CustomItem shape. */
const toCustomItem = (item: CatalogItem): CustomItem => ({
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
});

/** Normalize any supported backup version (1-4) to the current table set. */
const parseBackup = (data: Record<string, unknown>): BackupPayload => {
  const version = data.version;
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4) {
    throw new Error('Unsupported data format version');
  }

  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const settings = (data.settings as Partial<UserSettings> | undefined) ?? undefined;

  if (version === 1) {
    const catalogItems = arr<CatalogItem>(data.catalogItems);
    return {
      favorites: catalogItems.filter((i) => i.isFavorite).map((i) => ({ id: i.id })),
      customItems: catalogItems.filter((i) => !i.isBuiltin).map(toCustomItem),
      prLogs: arr<PRLog>(data.prLogs),
      goals: [],
      dailyCheckIns: [],
      settings,
    };
  }

  return {
    favorites: arr<Favorite>(data.favorites),
    customItems: arr<CustomItem>(data.customItems),
    prLogs: arr<PRLog>(data.prLogs),
    goals: arr<Goal>(data.goals),
    dailyCheckIns: arr<DailyCheckIn>(data.dailyCheckIns),
    settings,
  };
};

/**
 * Import data from JSON (backup versions 1-4).
 *
 * Replace semantics: every user-data table is cleared and refilled inside ONE
 * transaction — if anything fails, nothing is changed. Rows without a stored
 * unit are stamped with the backup's (or current) settings unit.
 */
export const importData = async (json: string): Promise<void> => {
  const payload = parseBackup(JSON.parse(json));

  await db.transaction('rw', USER_TABLES(), async () => {
    const current = await getSettings();
    const settings: UserSettings | undefined = payload.settings
      ? { ...DEFAULT_SETTINGS, ...payload.settings }
      : undefined;
    const units = settings ?? current;

    await Promise.all(USER_TABLES().filter((t) => t !== db.settings).map((t) => t.clear()));

    if (payload.favorites.length) await db.favorites.bulkPut(payload.favorites);
    if (payload.customItems.length) await db.customItems.bulkPut(payload.customItems);
    if (payload.prLogs.length) {
      await db.prLogs.bulkPut(payload.prLogs.map((log) => stampLogUnits(log, units)));
    }
    if (payload.goals.length) {
      await db.goals.bulkPut(payload.goals.map((goal) => stampGoalUnits(goal, units)));
    }
    if (payload.dailyCheckIns.length) await db.dailyCheckIns.bulkPut(payload.dailyCheckIns);
    if (settings) await db.settings.put({ id: 'default', ...settings });
  });
};

/**
 * Delete ALL user data (favorites, custom items, logs, goals, check-ins) and
 * reset settings to defaults — atomically. Callers should reload their stores
 * afterwards (catalogStore.refreshData / goalsStore.reload / checkInStore.reload).
 */
export const clearAllData = async (): Promise<void> => {
  await db.transaction('rw', USER_TABLES(), async () => {
    await Promise.all(USER_TABLES().map((t) => t.clear()));
    await db.settings.put({ id: 'default', ...DEFAULT_SETTINGS });
  });
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
  reps?: number,
  pool?: { scoreTypeId?: ScoreType; timeCap?: number; targetReps?: number; distance?: number }
): Promise<Goal | undefined> => {
  const activeGoals = await db.goals
    .where('itemId')
    .equals(itemId)
    .and((goal) => goal.status === 'active')
    .toArray();

  // Resolve the item once (only needed to backfill the score pool of legacy goals).
  const item = pool?.scoreTypeId ? await getCatalogItemById(itemId) : undefined;

  // Find goal matching variant, reps, and — for multi-mode items — the score pool.
  return activeGoals.find((goal) => {
    const variantMatch = variant === undefined || goal.variant === variant;
    const repsMatch = reps === undefined || goal.reps === reps;
    let poolMatch = true;
    if (pool?.scoreTypeId && item) {
      // Backfill legacy goals (no scoreTypeId) to the item's primary score type.
      const goalScoreType = goal.scoreTypeId ?? item.scoreType;
      poolMatch =
        goalScoreType === pool.scoreTypeId &&
        (pool.timeCap === undefined || goal.timeCap === pool.timeCap) &&
        (pool.targetReps === undefined || goal.targetReps === pool.targetReps);
    }
    const distanceMatch = pool?.distance === undefined || goal.distance === pool.distance;
    return variantMatch && repsMatch && poolMatch && distanceMatch;
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
  const now = todayLocal();
  const settings = await getSettings();

  await db.goals.add({
    id,
    itemId: input.itemId,
    targetValue: input.targetValue,
    targetDate: input.targetDate,
    createdAt: now,
    status: 'active',
    variant: input.variant,
    reps: input.reps,
    scoreTypeId: input.scoreTypeId,
    timeCap: input.timeCap,
    targetReps: input.targetReps,
    distance: input.distance,
    unit: input.unit ?? settings.weightUnit,
    distanceUnit: input.distanceUnit ?? settings.distanceUnit,
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
  // A new targetValue is entered in the current display unit; record that unit
  // unless the caller specified one.
  if (updates.targetValue !== undefined && (updates.unit === undefined || updates.distanceUnit === undefined)) {
    const settings = await getSettings();
    updates = {
      ...updates,
      unit: updates.unit ?? settings.weightUnit,
      distanceUnit: updates.distanceUnit ?? settings.distanceUnit,
    };
  }
  await db.goals.update(id, updates);
};

/**
 * Mark a goal as achieved
 */
export const achieveGoal = async (id: string): Promise<void> => {
  const now = todayLocal();
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
