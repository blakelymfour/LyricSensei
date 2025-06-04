import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useThemeContext } from "@/components/ThemeProvider";
import { useDataContext } from "@/contexts/DataContext";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Search, Music, Brain, Share, ArrowRight, History, X } from "lucide-react";
import type { SongAnalysis } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<SongAnalysis | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [animatedParagraphs, setAnimatedParagraphs] = useState<Set<number>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useThemeContext();
  const queryClient = useQueryClient();
  const { favorites, refreshData, optimisticToggleFavorite } = useDataContext();

  // Helper function to check if a song is favorited
  const isFavorited = (songId: number) => {
    return favorites.some(fav => fav.songAnalysisId === songId);
  };

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/songs/search", { query });
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedAnalysis(data);
      setAnimatedParagraphs(new Set());
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/songs/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search/history"] });
      
      // Trigger staggered animation for analysis paragraphs
      setTimeout(() => {
        const totalParagraphs = data.lyricsAnalysis.split('\n').filter((paragraph: string) => paragraph.trim()).length;
        for (let i = 0; i < totalParagraphs; i++) {
          setTimeout(() => {
            setAnimatedParagraphs(prev => new Set(Array.from(prev).concat([i])));
          }, i * 150);
        }
      }, 500);
    },
  });

  // Recent analyses
  const { data: recentAnalyses, isLoading: isLoadingHistory } = useQuery<SongAnalysis[]>({
    queryKey: ["/api/songs/history"],
    enabled: !!user,
  });

  // Favorites mutation
  const favoriteMutation = useMutation({
    mutationFn: async (songAnalysisId: number) => {
      const res = await apiRequest("POST", "/api/favorites", { songAnalysisId });
      return res.json();
    },
    onSuccess: () => {
      refreshData();
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (songAnalysisId: number) => {
      await apiRequest("DELETE", `/api/favorites/${songAnalysisId}`);
    },
    onSuccess: () => {
      refreshData();
    },
  });

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      searchInputRef.current?.focus();
      return;
    }
    searchMutation.mutate(searchQuery.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    searchMutation.mutate(suggestion);
  };

  const popularSuggestions = [
    "Blinding Lights",
    "Bad Habit", 
    "As It Was",
    "Heat Waves",
    "Stay"
  ];

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
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/favorites'}
              className="text-purple-400 hover:text-purple-300"
            >
              <Heart className="w-4 h-4 mr-1" />
              Favorites
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/history'}
              className="text-purple-400 hover:text-purple-300"
            >Search History</Button>
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
      <div className="max-w-md mx-auto p-4">
        {/* Search Section */}
        <div className="mb-6">
          <div className="mb-4">
            <h2 className="font-bold dark:text-white text-[26px] text-center text-[#f0f1f5] mt-[4.25px] mb-[4.25px] pt-[8px] pb-[8px]">
              Discover the deeper meaning of your favorite music
            </h2>
            <p className="dark:text-gray-400 text-center pt-[4px] pb-[4px] font-medium text-[#ccd3e0] text-[15px]">Search, discover, and share</p>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search for your song..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="py-4 text-lg dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#27417d] pt-[18px] pb-[18px] pl-[40.25px] pr-[40.25px] mt-[2px] mb-[2px]"
              disabled={searchMutation.isPending}
            />
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !searchQuery.trim()}
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-500 hover:bg-purple-600 rounded-xl"
            >
              {searchMutation.isPending ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>


        </div>

        {/* Search Results */}
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
                      ✕
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
                    // Skip empty lines
                    if (!paragraph.trim()) {
                      return null;
                    }

                    // Skip metadata lines that should only appear in header
                    if (paragraph.match(/^Genre:\s*/i) || paragraph.match(/^Release Year:\s*/i)) {
                      return null;
                    }

                    const isAnimated = animatedParagraphs.has(index);
                    const isHighlighted = highlightedSection === paragraph;

                    // Handle markdown headers (### and ##)
                    if (paragraph.startsWith('###') || paragraph.startsWith('##')) {
                      const headerText = paragraph.replace(/^#{2,3}\s*/, '');
                      return (
                        <div
                          key={index}
                          className={`mb-3 mt-4 transition-all duration-500 transform cursor-pointer hover:scale-105 opacity-100 translate-y-0 ${
                            isHighlighted ? 'bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 shadow-lg' : ''
                          }`}
                          onClick={() => setHighlightedSection(isHighlighted ? null : paragraph)}
                          onMouseEnter={() => setHighlightedSection(paragraph)}
                          onMouseLeave={() => setHighlightedSection(null)}
                        >
                          <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 relative">
                            {headerText}
                            {isHighlighted && (
                              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-purple-500 animate-pulse"></span>
                            )}
                          </h3>
                        </div>
                      );
                    }

                    // Make "Themes" bold and remove asterisks
                    if (paragraph.toLowerCase().includes('themes:') || paragraph.includes('**Themes:**')) {
                      return (
                        <div
                          key={index}
                          className={`mb-3 last:mb-0 transition-all duration-500 transform cursor-pointer hover:scale-105 opacity-100 translate-y-0 ${
                            isHighlighted ? 'bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 shadow-lg' : ''
                          }`}
                          onClick={() => setHighlightedSection(isHighlighted ? null : paragraph)}
                          onMouseEnter={() => setHighlightedSection(paragraph)}
                          onMouseLeave={() => setHighlightedSection(null)}
                        >
                          <p className="relative">
                            <span className="font-bold text-purple-600 dark:text-purple-400 relative">
                              Themes:
                              {isHighlighted && (
                                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-purple-500 animate-pulse"></span>
                              )}
                            </span>
                          </p>
                        </div>
                      );
                    }
                    
                    // Check for other bold sections and make them purple
                    if (paragraph.includes('**') && paragraph.includes(':')) {
                      const cleanedParagraph = paragraph.replace(/\*\*/g, '');
                      const parts = cleanedParagraph.split(':');
                      if (parts.length > 1) {
                        return (
                          <div
                            key={index}
                            className={`mb-3 last:mb-0 transition-all duration-500 transform cursor-pointer hover:scale-105 opacity-100 translate-y-0 ${
                              isHighlighted ? 'bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2 shadow-lg' : ''
                            }`}
                            onClick={() => setHighlightedSection(isHighlighted ? null : paragraph)}
                            onMouseEnter={() => setHighlightedSection(paragraph)}
                            onMouseLeave={() => setHighlightedSection(null)}
                          >
                            <p className="relative">
                              <span className="font-bold text-purple-600 dark:text-purple-400 relative">
                                {parts[0]}:
                                {isHighlighted && (
                                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-purple-500 animate-pulse"></span>
                                )}
                              </span>
                              {parts.slice(1).join(':')}
                            </p>
                          </div>
                        );
                      }
                    }
                    
                    // Remove asterisks from all other lines
                    const cleanedParagraph = paragraph.replace(/\*\*/g, '');
                    
                    return (
                      <div
                        key={index}
                        className={`mb-3 last:mb-0 transition-all duration-500 transform cursor-pointer hover:scale-105 opacity-100 translate-y-0 ${
                          isHighlighted ? 'bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 shadow-lg border-l-4 border-purple-500' : ''
                        }`}
                        onClick={() => setHighlightedSection(isHighlighted ? null : paragraph)}
                        onMouseEnter={() => setHighlightedSection(paragraph)}
                        onMouseLeave={() => setHighlightedSection(null)}
                      >
                        <p className="relative">
                          {cleanedParagraph}
                          {isHighlighted && (
                            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent animate-pulse"></span>
                          )}
                        </p>
                      </div>
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

        {/* Recent Searches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-white text-[#f0f1f5]">
              Recent Searches
            </h3>

          </div>

          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : recentAnalyses && recentAnalyses.length > 0 ? (
            <div className="space-y-3">
              {recentAnalyses.slice(0, 5).map((analysis) => (
                <Card
                  key={analysis.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-md"
                  onClick={() => setSelectedAnalysis(analysis)}
                >
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
                      </div>
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
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<History className="w-12 h-12" />}
              title="No Recent Searches"
              description="Search for songs to see your analysis history here"
            />
          )}
        </div>

        {/* Bottom padding for navigation */}
        <div className="h-20" />
      </div>
    </div>
  );
}
