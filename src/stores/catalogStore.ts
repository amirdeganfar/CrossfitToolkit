import { create } from 'zustand';
import type { CatalogItem, PRLog, UserSettings } from '../types/catalog';
import * as db from '../db';
import { useGoalsStore } from './goalsStore';
import { useCheckInStore } from './checkInStore';
import { getClockBackup, restoreClockBackup, resetClockData } from './clockStore';

interface CatalogState {
  // Data
  catalogItems: CatalogItem[];
  favorites: CatalogItem[];
  recentLogs: PRLog[];
  settings: UserSettings;
  
  // UI State
  /** True only during the first initialize() (App shows a full-screen spinner). */
  isLoading: boolean;
  /** True while refreshData() runs (import, clear-all). Never unmounts the app. */
  isRefreshing: boolean;
  isInitialized: boolean;
  searchQuery: string;
  selectedCategory: CatalogItem['category'] | 'All';
  
  // Actions
  initialize: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: CatalogItem['category'] | 'All') => void;
  toggleFavorite: (id: string) => Promise<void>;
  /** Save a log; resolves to the saved row (id + stamped units) — pass it to goalsStore.checkGoalsOnNewPR. */
  addPRLog: (log: Omit<PRLog, 'id' | 'createdAt'>) => Promise<PRLog>;
  deletePRLog: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  exportData: () => Promise<string>;
  /** Import a backup, then reload catalog, goals and check-in stores. */
  importData: (json: string) => Promise<void>;
  /** Delete all user data (incl. timer presets/countdown/sound), reset settings to defaults, then reload all stores. */
  clearAllData: () => Promise<void>;
}

/** Reload every data store from the DB (after import / clear-all). */
const reloadAllStores = async (): Promise<void> => {
  await useCatalogStore.getState().refreshData();
  await Promise.all([
    useGoalsStore.getState().reload(useCatalogStore.getState().catalogItems),
    useCheckInStore.getState().reload(),
  ]);
};

export const useCatalogStore = create<CatalogState>((set, get) => ({
  // Initial state
  catalogItems: [],
  favorites: [],
  recentLogs: [],
  settings: { weightUnit: 'kg', distanceUnit: 'm', hasSeenOnboarding: false, minSleepHours: 7, theme: 'system' },
  isLoading: false,
  isRefreshing: false,
  isInitialized: false,
  searchQuery: '',
  selectedCategory: 'All',

  // Initialize database and load data
  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true });
    
    try {
      await db.initializeDatabase();
      
      const [catalogItems, recentLogs, settings] = await Promise.all([
        db.getAllCatalogItems(),
        db.getRecentPRLogs(10),
        db.getSettings(),
      ]);

      const favorites = catalogItems.filter((item) => item.isFavorite);

      set({
        catalogItems,
        favorites,
        recentLogs,
        settings,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Store] Failed to initialize:', error);
      set({ isLoading: false });
    }
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Set selected category filter
  setSelectedCategory: (category: CatalogItem['category'] | 'All') => {
    set({ selectedCategory: category });
  },

  // Toggle favorite status
  toggleFavorite: async (id: string) => {
    try {
      await db.toggleFavorite(id);

      const catalogItems = await db.getAllCatalogItems();
      const favorites = catalogItems.filter((item) => item.isFavorite);

      set({ catalogItems, favorites });
    } catch (error) {
      console.error('[Store] Failed to toggle favorite:', error);
    }
  },

  // Add a new PR log
  addPRLog: async (log: Omit<PRLog, 'id' | 'createdAt'>) => {
    const saved = await db.addPRLog(log);
    const recentLogs = await db.getRecentPRLogs(10);
    set({ recentLogs });
    return saved;
  },

  // Delete a PR log
  deletePRLog: async (id: string) => {
    await db.deletePRLog(id);
    const recentLogs = await db.getRecentPRLogs(10);
    set({ recentLogs });
  },

  // Refresh all data from database
  // Uses isRefreshing (not isLoading) so the app's OnboardingGuard doesn't unmount everything.
  refreshData: async () => {
    set({ isRefreshing: true });

    try {
      const [catalogItems, recentLogs, settings] = await Promise.all([
        db.getAllCatalogItems(),
        db.getRecentPRLogs(10),
        db.getSettings(),
      ]);

      const favorites = catalogItems.filter((item) => item.isFavorite);

      set({ catalogItems, favorites, recentLogs, settings });
    } catch (error) {
      console.error('[Store] Failed to refresh data:', error);
      throw error;
    } finally {
      set({ isRefreshing: false });
    }
  },

  // Update settings
  updateSettings: async (updates: Partial<UserSettings>) => {
    const previous = get().settings;
    await db.updateSettings(updates);
    const settings = await db.getSettings();
    set({ settings });

    // Goal display strings depend on units; recovery score on min sleep.
    if (settings.weightUnit !== previous.weightUnit || settings.distanceUnit !== previous.distanceUnit) {
      if (useGoalsStore.getState().isInitialized) {
        await useGoalsStore.getState().reload(get().catalogItems);
      }
    }
    if (settings.minSleepHours !== previous.minSleepHours && useCheckInStore.getState().isInitialized) {
      await useCheckInStore.getState().refresh();
    }
  },

  // Export all data
  exportData: async () => {
    return db.exportData({ clock: getClockBackup() });
  },

  // Import data from JSON
  importData: async (json: string) => {
    const { clock } = await db.importData(json);
    restoreClockBackup(clock);
    await reloadAllStores();
  },

  clearAllData: async () => {
    await db.clearAllData();
    resetClockData();
    await reloadAllStores();
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS (derived state)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get filtered catalog items based on search query and category
 */
export const useFilteredCatalogItems = () => {
  return useCatalogStore((state) => {
    let items = state.catalogItems;

    // Filter by category
    if (state.selectedCategory !== 'All') {
      items = items.filter((item) => item.category === state.selectedCategory);
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    }

    return items;
  });
};

/**
 * Get catalog item by ID
 */
export const useCatalogItem = (id: string) => {
  return useCatalogStore((state) =>
    state.catalogItems.find((item) => item.id === id)
  );
};
