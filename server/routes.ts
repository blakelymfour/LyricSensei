import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { searchSong, getSongDetails } from "./lyricsApi";
import { analyzeLyrics, generateSongMeaning } from "./openai";
import { insertSongAnalysisSchema, insertFavoriteSchema, insertSearchHistorySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Song search and analysis
  app.post("/api/songs/search", isAuthenticated, async (req: any, res) => {
    try {
      const { query } = req.body;
      const userId = req.user.claims.sub;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }

      // Search for song information
      const songInfo = await searchSong(query.trim());
      
      if (!songInfo) {
        return res.status(404).json({ message: "Song not found" });
      }

      // Get additional details if we have basic info
      const detailedInfo = await getSongDetails(songInfo.title, songInfo.artist);
      const finalSongInfo = { ...songInfo, ...detailedInfo };

      // Generate AI analysis
      let analysis: string;
      
      if (finalSongInfo.lyrics) {
        // Analyze actual lyrics if available
        const lyricsAnalysis = await analyzeLyrics(
          finalSongInfo.title,
          finalSongInfo.artist,
          finalSongInfo.lyrics
        );
        analysis = `${lyricsAnalysis.meaning}\n\nKey themes: ${lyricsAnalysis.themes.join(", ")}\nMood: ${lyricsAnalysis.mood}\n\n${lyricsAnalysis.interpretation}`;
      } else {
        // Generate analysis based on song info
        analysis = await generateSongMeaning(
          finalSongInfo.title,
          finalSongInfo.artist,
          finalSongInfo.genre,
          finalSongInfo.year
        );
      }

      // Extract metadata from AI analysis
      const genreMatch = analysis.match(/Genre:\s*(.+)/i);
      const yearMatch = analysis.match(/Release Year:\s*(\d{4})/i);
      
      const extractedGenre = genreMatch ? genreMatch[1].trim() : finalSongInfo.genre;
      const extractedYear = yearMatch ? parseInt(yearMatch[1]) : finalSongInfo.year;

      // Clean analysis by removing metadata lines
      const cleanedAnalysis = analysis
        .replace(/Genre:\s*.+/gi, '')
        .replace(/Release Year:\s*\d{4}/gi, '')
        .trim();

      // Save analysis to database
      const songAnalysis = await storage.createSongAnalysis({
        title: finalSongInfo.title,
        artist: finalSongInfo.artist,
        genre: extractedGenre || null,
        yearReleased: extractedYear || null,
        lyricsAnalysis: cleanedAnalysis,
        userId
      });

      // Add to search history
      await storage.addToSearchHistory({
        userId,
        searchQuery: query,
        songAnalysisId: songAnalysis.id
      });

      res.json(songAnalysis);
    } catch (error) {
      console.error("Error searching song:", error);
      res.status(500).json({ 
        message: "Failed to analyze song", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get user's song analyses (history)
  app.get("/api/songs/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const analyses = await storage.getUserSongAnalyses(userId, limit);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching user history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Get specific song analysis
  app.get("/api/songs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getSongAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ message: "Song analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching song analysis:", error);
      res.status(500).json({ message: "Failed to fetch song analysis" });
    }
  });

  // Favorites management
  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFavoriteSchema.parse({
        ...req.body,
        userId
      });

      // Check if already favorited
      const isFav = await storage.isFavorite(userId, validatedData.songAnalysisId);
      if (isFav) {
        return res.status(400).json({ message: "Song is already in favorites" });
      }

      const favorite = await storage.addToFavorites(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding to favorites:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete("/api/favorites/:songAnalysisId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const songAnalysisId = parseInt(req.params.songAnalysisId);

      await storage.removeFromFavorites(userId, songAnalysisId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  // Search history
  app.get("/api/search/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const history = await storage.getUserSearchHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  app.delete("/api/search/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearUserSearchHistory(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing search history:", error);
      res.status(500).json({ message: "Failed to clear search history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
