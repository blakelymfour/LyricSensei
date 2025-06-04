import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/components/ThemeProvider";
import { apiRequest } from "@/lib/queryClient";
import { User, Heart, BarChart3, History, Settings, HelpCircle, LogOut, ArrowLeft } from "lucide-react";
import type { SongAnalysis } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useThemeContext();
  const queryClient = useQueryClient();

  // Get user stats
  const { data: analyses } = useQuery<SongAnalysis[]>({
    queryKey: ["/api/songs/history"],
  });

  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
  });

  const { data: searchHistory } = useQuery({
    queryKey: ["/api/search/history"],
  });

  // Clear search history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/search/history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search/history"] });
    },
  });

  const handleSignOut = () => {
    window.location.href = '/api/logout';
  };

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm p-4 sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage your account and preferences
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{userInitials}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "User"}
              </h2>
              {user?.email && (
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <span className="text-green-500 font-semibold text-lg">
                  {analyses?.length || 0}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Songs Analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-semibold text-lg">
                  {favorites?.length || 0}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Favorites</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="space-y-1">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center space-x-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-sm">{isDarkMode ? "☀️" : "🌙"}</span>
                </div>
                <div className="flex-1">
                  <span className="text-gray-900 dark:text-white font-medium">Theme</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isDarkMode ? "Dark" : "Light"} mode
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {isDarkMode ? "Dark" : "Light"}
                </Badge>
              </button>

              <button
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                className="w-full flex items-center space-x-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <History className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1">
                  <span className="text-gray-900 dark:text-white font-medium">Clear Search History</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Remove all search records
                  </p>
                </div>
                {clearHistoryMutation.isPending && (
                  <LoadingSpinner size="sm" />
                )}
              </button>

              <button className="w-full flex items-center space-x-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Settings className="w-4 h-4 text-gray-500" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">Settings</span>
              </button>

              <button className="w-full flex items-center space-x-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                </div>
                <span className="text-gray-900 dark:text-white font-medium">Help & Support</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 p-4 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-200 dark:border-gray-700"
              >
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-red-500 font-medium">Sign Out</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom padding */}
        <div className="h-20" />
      </div>
    </div>
  );
}
