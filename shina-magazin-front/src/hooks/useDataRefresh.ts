import { useState, useCallback, useRef, useEffect } from 'react';

interface UseDataRefreshOptions<T> {
  fetchFn: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  successDuration?: number; // Default: 2000ms
}

interface UseDataRefreshReturn {
  initialLoading: boolean;
  refreshing: boolean;
  refreshSuccess: boolean;
  error: string | null;
  loadData: (isManualRefresh?: boolean) => Promise<void>;
}

/**
 * Custom hook for managing data refresh with smooth UX
 *
 * Features:
 * - Distinguishes between initial load and refresh
 * - Shows overlay during refresh (content stays visible)
 * - Success feedback for manual refreshes
 * - Consistent error handling
 *
 * @example
 * const { initialLoading, refreshing, refreshSuccess, loadData } = useDataRefresh({
 *   fetchFn: async () => await api.getData(),
 *   onSuccess: (data) => setData(data),
 *   onError: () => toast.error('Failed to load data'),
 * });
 */
export function useDataRefresh<T>({
  fetchFn,
  onSuccess,
  onError,
  successDuration = 2000,
}: UseDataRefreshOptions<T>): UseDataRefreshReturn {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to store latest callbacks and state without triggering re-renders
  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const initialLoadingRef = useRef(true);

  // Keep refs updated
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadData = useCallback(async (isManualRefresh = false) => {
    const isFirstLoad = initialLoadingRef.current;

    // Use overlay for refreshes, full loader for initial load
    if (!isFirstLoad) {
      setRefreshing(true);
    }

    if (isManualRefresh) {
      setRefreshSuccess(false);
    }

    setError(null);

    try {
      const data = await fetchFnRef.current();

      if (onSuccessRef.current) {
        onSuccessRef.current(data);
      }

      // Show success feedback for manual refreshes only
      if (isManualRefresh) {
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), successDuration);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ma\'lumotlarni yuklashda xatolik';
      setError(errorMessage);

      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    } finally {
      initialLoadingRef.current = false;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [successDuration]);

  return {
    initialLoading,
    refreshing,
    refreshSuccess,
    error,
    loadData,
  };
}
