import { create } from 'zustand';
import type { CatalogItem, PRLog, UserSettings } from '../types/catalog';
import * as db from '../db';

interface CatalogState {
  // Data
  catalogItems: CatalogItem[];
  favorites: CatalogItem[];
  recentLogs: PRLog[];
  settings: UserSettings;
  
  // UI State
  isLoading: boolean;
  isInitialized: boolean;
  searchQuery: string;
  selectedCategory: CatalogItem['category'] | 'All';
  
  // Actions
  initialize: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: CatalogItem['category'] | 'All') => void;
  toggleFavorite: (id: string) => Promise<void>;
  addPRLog: (log: Omit<PRLog, 'id' | 'createdAt'>) => Promise<string>;
  deletePRLog: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  // Initial state
  catalogItems: [],
  favorites: [],
  recentLogs: [],
  settings: { weightUnit: 'kg', distanceUnit: 'm' },
  isLoading: false,
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
    await db.toggleFavorite(id);
    
    const catalogItems = await db.getAllCatalogItems();
    const favorites = catalogItems.filter((item) => item.isFavorite);
    
    set({ catalogItems, favorites });
  },

  // Add a new PR log
  addPRLog: async (log: Omit<PRLog, 'id' | 'createdAt'>) => {
    const id = await db.addPRLog(log);
    const recentLogs = await db.getRecentPRLogs(10);
    set({ recentLogs });
    return id;
  },

  // Delete a PR log
  deletePRLog: async (id: string) => {
    await db.deletePRLog(id);
    const recentLogs = await db.getRecentPRLogs(10);
    set({ recentLogs });
  },

  // Refresh all data from database
  refreshData: async () => {
    set({ isLoading: true });
    
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
      isLoading: false,
    });
  },

  // Update settings
  updateSettings: async (updates: Partial<UserSettings>) => {
    await db.updateSettings(updates);
    const settings = await db.getSettings();
    set({ settings });
  },

  // Export all data
  exportData: async () => {
    return db.exportData();
  },

  // Import data from JSON
  importData: async (json: string) => {
    await db.importData(json);
    await get().refreshData();
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
