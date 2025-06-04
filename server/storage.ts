import {
  users,
  songAnalyses,
  favorites,
  searchHistory,
  type User,
  type UpsertUser,
  type SongAnalysis,
  type InsertSongAnalysis,
  type Favorite,
  type InsertFavorite,
  type SearchHistory,
  type InsertSearchHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Song analysis operations
  createSongAnalysis(analysis: InsertSongAnalysis): Promise<SongAnalysis>;
  getSongAnalysis(id: number): Promise<SongAnalysis | undefined>;
  getUserSongAnalyses(userId: string, limit?: number): Promise<SongAnalysis[]>;
  
  // Favorites operations
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: string, songAnalysisId: number): Promise<void>;
  getUserFavorites(userId: string): Promise<(Favorite & { songAnalysis: SongAnalysis })[]>;
  isFavorite(userId: string, songAnalysisId: number): Promise<boolean>;
  
  // Search history operations
  addToSearchHistory(search: InsertSearchHistory): Promise<SearchHistory>;
  getUserSearchHistory(userId: string, limit?: number): Promise<SearchHistory[]>;
  clearUserSearchHistory(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Song analysis operations
  async createSongAnalysis(analysis: InsertSongAnalysis): Promise<SongAnalysis> {
    const [songAnalysis] = await db
      .insert(songAnalyses)
      .values(analysis)
      .returning();
    return songAnalysis;
  }

  async getSongAnalysis(id: number): Promise<SongAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(songAnalyses)
      .where(eq(songAnalyses.id, id));
    return analysis;
  }

  async getUserSongAnalyses(userId: string, limit = 50): Promise<SongAnalysis[]> {
    return await db
      .select()
      .from(songAnalyses)
      .where(eq(songAnalyses.userId, userId))
      .orderBy(desc(songAnalyses.createdAt))
      .limit(limit);
  }

  // Favorites operations
  async addToFavorites(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: string, songAnalysisId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.songAnalysisId, songAnalysisId)
        )
      );
  }

  async getUserFavorites(userId: string): Promise<(Favorite & { songAnalysis: SongAnalysis })[]> {
    return await db
      .select({
        id: favorites.id,
        userId: favorites.userId,
        songAnalysisId: favorites.songAnalysisId,
        createdAt: favorites.createdAt,
        songAnalysis: {
          id: songAnalyses.id,
          title: songAnalyses.title,
          artist: songAnalyses.artist,
          genre: songAnalyses.genre,
          yearReleased: songAnalyses.yearReleased,
          lyricsAnalysis: songAnalyses.lyricsAnalysis,
          userId: songAnalyses.userId,
          createdAt: songAnalyses.createdAt,
        },
      })
      .from(favorites)
      .innerJoin(songAnalyses, eq(favorites.songAnalysisId, songAnalyses.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .limit(20);
  }

  async isFavorite(userId: string, songAnalysisId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.songAnalysisId, songAnalysisId)
        )
      );
    return !!favorite;
  }

  // Search history operations
  async addToSearchHistory(search: InsertSearchHistory): Promise<SearchHistory> {
    const [newSearch] = await db
      .insert(searchHistory)
      .values(search)
      .returning();
    return newSearch;
  }

  async getUserSearchHistory(userId: string, limit = 20): Promise<SearchHistory[]> {
    return await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(limit);
  }

  async clearUserSearchHistory(userId: string): Promise<void> {
    await db
      .delete(searchHistory)
      .where(eq(searchHistory.userId, userId));
  }
}

export const storage = new DatabaseStorage();
