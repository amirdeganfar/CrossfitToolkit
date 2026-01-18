import type { CatalogItem } from '../types/catalog';

// Known dual-metric item IDs (fallback for items without metrics field)
const DUAL_METRIC_IDS = ['row', 'bike-cals', 'ski-erg'];
// Known distance-only item IDs (fallback for items without metrics field)
const DISTANCE_ONLY_IDS = ['run'];

/**
 * Check if an item supports both distance and calories metrics
 * Falls back to ID/name matching for items without metrics field (legacy data)
 */
export const isDualMetricItem = (item: CatalogItem | null | undefined): boolean => {
  if (!item) return false;
  
  // Use metrics field if available
  if (item.metrics) return item.metrics === 'distance+calories';
  
  // Fallback for legacy items without metrics field
  if (item.category !== 'Monostructural' || item.scoreType !== 'Time') return false;
  return DUAL_METRIC_IDS.includes(item.id) || 
    item.name.toLowerCase().includes('row') || 
    item.name.toLowerCase().includes('bike') ||
    item.name.toLowerCase().includes('ski');
};

/**
 * Check if an item supports only distance metrics
 * Falls back to ID/name matching for items without metrics field (legacy data)
 */
export const isDistanceOnlyItem = (item: CatalogItem | null | undefined): boolean => {
  if (!item) return false;
  
  // Use metrics field if available
  if (item.metrics) return item.metrics === 'distance';
  
  // Fallback for legacy items without metrics field
  if (item.category !== 'Monostructural' || item.scoreType !== 'Time') return false;
  if (isDualMetricItem(item)) return false;
  return DISTANCE_ONLY_IDS.includes(item.id) || item.name.toLowerCase().includes('run');
};

/**
 * Check if an item supports calories (either calories-only or dual-metric)
 */
export const supportsCalories = (item: CatalogItem | null | undefined): boolean =>
  item?.metrics === 'distance+calories' || item?.metrics === 'calories' || isDualMetricItem(item);

/**
 * Check if an item supports distance (either distance-only or dual-metric)
 */
export const supportsDistance = (item: CatalogItem | null | undefined): boolean =>
  item?.metrics === 'distance+calories' || item?.metrics === 'distance' || 
  isDualMetricItem(item) || isDistanceOnlyItem(item);
