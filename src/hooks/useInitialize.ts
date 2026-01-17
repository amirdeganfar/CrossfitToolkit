import { useEffect } from 'react';
import { useCatalogStore } from '../stores/catalogStore';

/**
 * Hook to initialize the app on mount
 */
export const useInitialize = () => {
  const initialize = useCatalogStore((state) => state.initialize);
  const isInitialized = useCatalogStore((state) => state.isInitialized);
  const isLoading = useCatalogStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { isInitialized, isLoading };
};
