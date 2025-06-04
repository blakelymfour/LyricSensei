import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import type { Favorite, SongAnalysis } from '@shared/schema';

interface DataContextType {
  favorites: (Favorite & { songAnalysis: SongAnalysis })[];
  history: SongAnalysis[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  optimisticToggleFavorite: (songAnalysisId: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<(Favorite & { songAnalysis: SongAnalysis })[]>([]);
  const [history, setHistory] = useState<SongAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadData = async () => {
    if (!isAuthenticated || !user || hasLoaded) return;
    
    setIsLoading(true);
    try {
      const [favoritesRes, historyRes] = await Promise.all([
        apiRequest('GET', '/api/favorites'),
        apiRequest('GET', '/api/songs/history')
      ]);
      
      const favoritesData = await favoritesRes.json();
      const historyData = await historyRes.json();
      
      setFavorites(favoritesData || []);
      setHistory(historyData || []);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setHasLoaded(false);
    await loadData();
  };

  // Optimistic update for instant UI feedback
  const optimisticToggleFavorite = (songAnalysisId: number) => {
    setFavorites(prevFavorites => {
      const existingIndex = prevFavorites.findIndex(fav => fav.songAnalysisId === songAnalysisId);
      
      if (existingIndex >= 0) {
        // Remove from favorites
        return prevFavorites.filter((_, index) => index !== existingIndex);
      } else {
        // Add to favorites - we need to find the song analysis
        const songAnalysis = history.find(song => song.id === songAnalysisId);
        if (songAnalysis && user && typeof user === 'object' && 'id' in user) {
          const newFavorite: Favorite & { songAnalysis: SongAnalysis } = {
            id: Date.now(), // Temporary ID
            userId: String(user.id),
            songAnalysisId,
            createdAt: new Date(),
            songAnalysis
          };
          return [...prevFavorites, newFavorite];
        }
        return prevFavorites;
      }
    });
  };

  useEffect(() => {
    if (isAuthenticated && user && !hasLoaded) {
      loadData();
    }
  }, [isAuthenticated, user, hasLoaded]);

  return (
    <DataContext.Provider value={{ favorites, history, isLoading, refreshData, optimisticToggleFavorite }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}