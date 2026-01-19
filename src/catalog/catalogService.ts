import type { CatalogItem } from '../types/catalog';
import girls from './benchmarks_girls.json';
import heroes from './benchmarks_heroes.json';
import notable from './benchmarks_notable.json';
import open from './benchmarks_open.json';
import games from './benchmarks_games.json';
import lifts from './lifts.json';
import monostructural from './monostructural.json';
import skills from './skills.json';

/**
 * Catalog Service - Abstraction layer for catalog data access
 * 
 * Currently loads from static JSON file.
 * When backend is added, replace with API calls.
 */

// Type for the raw JSON data (without runtime fields)
type CatalogItemData = Omit<CatalogItem, 'isBuiltin' | 'isFavorite' | 'createdAt'>;

/**
 * Get all builtin catalog items
 * Future: fetch('/api/catalog')
 */
export const getBuiltinCatalog = (): CatalogItem[] => {
  const merged = [
    ...(girls as CatalogItemData[]),
    ...(heroes as CatalogItemData[]),
    ...(notable as CatalogItemData[]),
    ...(open as CatalogItemData[]),
    ...(games as CatalogItemData[]),
    ...(lifts as CatalogItemData[]),
    ...(monostructural as CatalogItemData[]),
    ...(skills as CatalogItemData[]),
  ];

  // Deduplicate by ID (first wins) to prevent accidental duplicates across files.
  const byId = new Map<string, CatalogItemData>();
  for (const item of merged) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return [...byId.values()].map((item) => ({
    ...item,
    isBuiltin: true,
    isFavorite: false,
    createdAt: 0, // Builtin items don't have a creation date
  }));
};

/**
 * Get a builtin catalog item by ID
 * Future: fetch(`/api/catalog/${id}`)
 */
export const getBuiltinCatalogItemById = (id: string): CatalogItem | undefined => {
  return getBuiltinCatalog().find((item) => item.id === id);
};

/**
 * Search builtin catalog items by name
 * Future: fetch(`/api/catalog/search?q=${query}`)
 */
export const searchBuiltinCatalog = (query: string): CatalogItem[] => {
  const lowerQuery = query.toLowerCase();
  return getBuiltinCatalog().filter((item) =>
    item.name.toLowerCase().includes(lowerQuery)
  );
};
