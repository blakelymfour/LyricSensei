import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import type { Favorite, SongAnalysis } from "@shared/schema";

// Custom hook that aggressively caches data
export function usePersistedFavorites() {
  const { user } = useAuth();
  
  return useQuery<(Favorite & { songAnalysis: SongAnalysis })[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Never garbage collect
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}

export function usePersistedHistory() {
  const { user } = useAuth();
  
  return useQuery<SongAnalysis[]>({
    queryKey: ["/api/songs/history"],
    enabled: !!user,
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Never garbage collect
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}