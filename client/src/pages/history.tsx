import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useDataContext } from "@/contexts/DataContext";
import { apiRequest } from "@/lib/queryClient";
import { Music, ArrowLeft, Calendar, Search, Brain, Share, Heart, ArrowRight, X } from "lucide-react";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import type { SongAnalysis } from "@shared/schema";

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SongAnalysis | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const localSearchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const { history, isLoading, favorites, refreshData, optimisticToggleFavorite } = useDataContext();
  const isReallyLoading = isLoading && history.length === 0;

  // Filter history based on local search
  const filteredHistory = history.filter(analysis =>
    analysis.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
    analysis.artist.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
    (analysis.genre && analysis.genre.toLowerCase().includes(localSearchQuery.toLowerCase()))
  );

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (songAnalysisId: number) => {
      await apiRequest("DELETE", `/api/favorites/${songAnalysisId}`);
    },
    onSuccess: () => {
      refreshData();
    },
  });

  // Add favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async (songAnalysisId: number) => {
      const res = await apiRequest("POST", "/api/favorites", { songAnalysisId });
      return res.json();
    },
    onSuccess: () => {
      refreshData();
    },
  });

  // Helper function to check if a song is favorited
  const isFavorited = (songId: number) => {
    return favorites.some(fav => fav.songAnalysisId === songId);
  };

  // Toggle favorite function with optimistic updates
  const toggleFavorite = (songAnalysisId: number) => {
    // Update UI immediately
    optimisticToggleFavorite(songAnalysisId);
    
    // Then make API call
    if (isFavorited(songAnalysisId)) {
      removeFavoriteMutation.mutate(songAnalysisId, {
        onError: () => {
          // Revert on error
          optimisticToggleFavorite(songAnalysisId);
        }
      });
    } else {
      favoriteMutation.mutate(songAnalysisId, {
        onError: () => {
          // Revert on error
          optimisticToggleFavorite(songAnalysisId);
        }
      });
    }
  };

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      return await apiRequest("POST", `/api/songs/search`, { query });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/history"] });
      setSearchQuery("");
      setLocation("/");
    }
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      await searchMutation.mutateAsync(searchQuery.trim());
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Use filtered history for display
  const recentAnalyses = filteredHistory.slice(0, 10);

  if (isReallyLoading) {
    return (
      <div className="min-h-screen bg-[#6606ba] text-[#d3d3e3]">
        {/* Header */}
        <header className="bg-gray-900 shadow-sm p-4 sticky top-0 z-30 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Lyric Sensei</h1>
                <p className="text-xs text-gray-400">Loading your search history...</p>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#6606ba] text-[#d3d3e3]">
      {/* Header */}
      <header className="bg-gray-900 shadow-sm p-4 sticky top-0 z-30 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Lyric Sensei</h1>
              <p className="text-xs text-gray-400">
                Welcome back, User!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-purple-400 hover:text-purple-300"
              >
                <Music className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            <Link href="/favorites">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-purple-400 hover:text-purple-300"
              >
                <Heart className="w-4 h-4 mr-1" />
                Favorites
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {isDarkMode ? "☀️" : "🌙"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/api/logout'}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      {/* Local Search Bar */}
      <div className="max-w-md mx-auto p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            ref={localSearchInputRef}
            type="text"
            placeholder="Search within your history..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="py-4 text-lg dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#27417d] pt-[18px] pb-[18px] pl-[40.25px] pr-[40.25px] mt-[2px] mb-[2px]"
          />
        </div>

        {/* Selected Analysis Detail */}
        {selectedAnalysis && (
          <Card className="mb-6 overflow-hidden border-purple-200 dark:border-purple-800">
            <CardContent className="p-0">
              {/* Track Header */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                <div className="flex items-start space-x-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Music className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1">
                      <span className="text-white/70 text-lg font-medium">Title: </span>
                      <span className="text-white text-lg font-bold">{selectedAnalysis.title}</span>
                    </div>
                    <div className="mb-1">
                      <span className="text-white/70 text-lg font-medium">Artist: </span>
                      <span className="text-white/90 text-lg">{selectedAnalysis.artist}</span>
                    </div>
                    <div className="mb-1">
                      <span className="text-white/70 text-lg font-medium">Genre: </span>
                      <span className="text-white/80 text-lg">{selectedAnalysis.genre || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-white/70 text-lg font-medium">Released: </span>
                      <span className="text-white/80 text-lg">{selectedAnalysis.yearReleased || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(selectedAnalysis.id);
                      }}
                      disabled={favoriteMutation.isPending || removeFavoriteMutation.isPending}
                    >
                      <Heart 
                        className={`w-5 h-5 ${
                          isFavorited(selectedAnalysis.id) 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-white'
                        }`} 
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => setSelectedAnalysis(null)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-500">AI Analysis</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-justify">
                  {selectedAnalysis.lyricsAnalysis.split('\n').map((paragraph, index) => {
                    if (!paragraph.trim()) {
                      return null;
                    }

                    // Skip metadata lines that should only appear in header
                    if (paragraph.match(/^Genre:\s*/i) || paragraph.match(/^Release Year:\s*/i)) {
                      return null;
                    }

                    // Handle markdown headers (### and ##)
                    if (paragraph.startsWith('###') || paragraph.startsWith('##')) {
                      const headerText = paragraph.replace(/^#{2,3}\s*/, '');
                      return (
                        <h3 key={index} className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-3 mt-4">
                          {headerText}
                        </h3>
                      );
                    }

                    if (paragraph.toLowerCase().includes('themes:') || paragraph.includes('**Themes:**')) {
                      return (
                        <p key={index} className="mb-3 last:mb-0">
                          <span className="font-bold text-purple-600 dark:text-purple-400">Themes:</span>
                        </p>
                      );
                    }
                    
                    if (paragraph.includes('**') && paragraph.includes(':')) {
                      const cleanedParagraph = paragraph.replace(/\*\*/g, '');
                      const parts = cleanedParagraph.split(':');
                      if (parts.length > 1) {
                        return (
                          <p key={index} className="mb-3 last:mb-0">
                            <span className="font-bold text-purple-600 dark:text-purple-400">{parts[0]}:</span>
                            {parts.slice(1).join(':')}
                          </p>
                        );
                      }
                    }
                    
                    const cleanedParagraph = paragraph.replace(/\*\*/g, '');
                    return (
                      <p key={index} className="mb-3 last:mb-0">
                        {cleanedParagraph}
                      </p>
                    );
                  })}
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <Button className="flex-1 bg-purple-500 hover:bg-purple-600" size="sm">
                    <Share className="w-4 h-4 mr-2" />
                    Share Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {recentAnalyses && recentAnalyses.length > 0 ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                Last 10 Searches
              </h2>
            </div>
            <div className="space-y-3">
              {recentAnalyses.map((analysis: SongAnalysis) => (
                <Card key={analysis.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-md" onClick={() => setSelectedAnalysis(analysis)}>
                  <CardContent className="p-4 text-[#ffffff] bg-[#3b006e] pt-[10px] pb-[10px] pl-[14px] pr-[14px] mt-[-1px] mb-[-1px] ml-[-1px] mr-[-1px] rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Music className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium dark:text-white text-[#ffffff]">
                          {analysis.title}
                        </h4>
                        <p className="dark:text-gray-400 font-medium text-[15px] text-[#beccde]">
                          {analysis.artist}
                        </p>
                        {analysis.genre && (
                          <p className="text-xs text-[#beccde]/80 mt-1">
                            {analysis.genre} • {analysis.yearReleased}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-500 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(analysis.id);
                          }}
                          disabled={favoriteMutation.isPending || removeFavoriteMutation.isPending}
                        >
                          <Heart 
                            className={`w-4 h-4 ${
                              isFavorited(analysis.id) 
                                ? 'fill-red-500 text-red-500' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </Button>
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-[#beccde]">
                          {analysis.createdAt 
                            ? format(new Date(analysis.createdAt), "dd MMM")
                            : ""}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<Music className="w-12 h-12 text-purple-400" />}
            title="No Search History"
            description="Start searching for songs to build your analysis collection"
            action={
              <Button className="bg-purple-500 hover:bg-purple-600" onClick={() => window.location.href = "/"}>
                Start Searching
              </Button>
            }
          />
        )}

        {/* Bottom padding */}
        <div className="h-20" />
      </div>
    </div>
  );
}