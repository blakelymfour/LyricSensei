import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function useDataPreloader() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Immediately start fetching all data in parallel
      const preloadData = async () => {
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ["/api/songs/history"],
            staleTime: 10 * 60 * 1000, // 10 minutes
          }),
          queryClient.prefetchQuery({
            queryKey: ["/api/favorites"],
            staleTime: 10 * 60 * 1000, // 10 minutes
          }),
        ]);
      };

      preloadData();
    }
  }, [isAuthenticated, user, queryClient]);
}