import type { CatalogItem } from '../types/catalog';
import catalogData from './catalog.json';

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
  return (catalogData as CatalogItemData[]).map((item) => ({
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
  const item = (catalogData as CatalogItemData[]).find((item) => item.id === id);
  if (!item) return undefined;
  
  return {
    ...item,
    isBuiltin: true,
    isFavorite: false,
    createdAt: 0,
  };
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
