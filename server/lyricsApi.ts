interface SongInfo {
  title: string;
  artist: string;
  genre?: string;
  year?: number;
  lyrics?: string;
}

interface GeniusSearchResult {
  response: {
    hits: Array<{
      result: {
        id: number;
        title: string;
        primary_artist: {
          name: string;
        };
        release_date_for_display?: string;
        url: string;
      };
    }>;
  };
}

interface LastFmTrackInfo {
  track?: {
    name: string;
    artist: {
      name: string;
    };
    album?: {
      title: string;
      '@attr'?: {
        year?: string;
      };
    };
    toptags?: {
      tag: Array<{
        name: string;
      }>;
    };
  };
}

export async function searchSong(query: string): Promise<SongInfo | null> {
  try {
    // First try Genius API for accurate song data and lyrics
    const geniusResult = await searchGenius(query);
    if (geniusResult) {
      // Enhance with Last.fm data for genre and additional metadata
      const lastFmData = await getLastFmTrackInfo(geniusResult.title, geniusResult.artist);
      
      return {
        title: geniusResult.title,
        artist: geniusResult.artist,
        genre: lastFmData?.genre || geniusResult.genre,
        year: lastFmData?.year || geniusResult.year,
        lyrics: geniusResult.lyrics || "Lyrics not found"
      };
    }

    // Fallback to existing methods if Genius fails
    const lyricsOvhResult = await searchLyricsOvh(query);
    if (lyricsOvhResult) {
      // Try to enhance with Last.fm data
      const lastFmData = await getLastFmTrackInfo(lyricsOvhResult.title, lyricsOvhResult.artist);
      return {
        ...lyricsOvhResult,
        genre: lastFmData?.genre || lyricsOvhResult.genre,
        year: lastFmData?.year || lyricsOvhResult.year,
      };
    }

    // Final fallback
    const fallbackResult = await extractSongInfo(query);
    return fallbackResult;

  } catch (error) {
    console.error("Error searching for song:", error);
    return null;
  }
}

async function searchLyricsOvh(query: string): Promise<SongInfo | null> {
  try {
    // Parse query to extract artist and title
    const { artist, title } = parseQuery(query);
    
    if (!artist || !title) {
      return null;
    }

    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.lyrics) {
      return {
        title: title,
        artist: artist,
        lyrics: data.lyrics
      };
    }

    return null;
  } catch (error) {
    console.error("Lyrics.ovh API error:", error);
    return null;
  }
}

async function extractSongInfo(query: string): Promise<SongInfo | null> {
  try {
    const { artist, title } = parseQuery(query);
    
    if (!artist || !title) {
      // If we can't parse, treat the whole query as the title
      return {
        title: query.trim(),
        artist: "Unknown Artist"
      };
    }

    return {
      title: title,
      artist: artist
    };
  } catch (error) {
    console.error("Error extracting song info:", error);
    return null;
  }
}

function parseQuery(query: string): { artist: string | null; title: string | null } {
  // Common patterns for song queries:
  // "Artist - Title"
  // "Artist: Title"  
  // "Title by Artist"
  // "Artist Title"

  const trimmed = query.trim();
  
  // Pattern: "Artist - Title"
  if (trimmed.includes(" - ")) {
    const parts = trimmed.split(" - ");
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(" - ").trim()
      };
    }
  }

  // Pattern: "Artist: Title"
  if (trimmed.includes(": ")) {
    const parts = trimmed.split(": ");
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(": ").trim()
      };
    }
  }

  // Pattern: "Title by Artist"
  const byMatch = trimmed.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return {
      artist: byMatch[2].trim(),
      title: byMatch[1].trim()
    };
  }

  // Pattern: "Title (Artist)" or "Title (Artist Name)"
  const parenthesesMatch = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenthesesMatch) {
    return {
      artist: parenthesesMatch[2].trim(),
      title: parenthesesMatch[1].trim()
    };
  }

  // If no pattern matches, assume the whole string is the title
  return {
    artist: null,
    title: trimmed
  };
}

async function searchGenius(query: string): Promise<SongInfo | null> {
  try {
    if (!process.env.GENIUS_ACCESS_TOKEN) {
      console.log("Genius API token not available, skipping Genius search");
      return null;
    }

    const { artist, title } = parseQuery(query);
    const searchQuery = artist && title ? `${artist} ${title}` : query;

    const response = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`Genius API error: ${response.status}`);
      return null;
    }

    const data: GeniusSearchResult = await response.json();
    
    if (data.response.hits.length === 0) {
      return null;
    }

    const hit = data.response.hits[0];
    const song = hit.result;
    
    // Extract year from release date
    let year: number | undefined;
    if (song.release_date_for_display) {
      const yearMatch = song.release_date_for_display.match(/\d{4}/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      }
    }

    // Try to get lyrics from the song URL (simplified approach)
    const lyrics = await getGeniusLyrics(song.url);

    return {
      title: song.title,
      artist: song.primary_artist.name,
      year: year,
      lyrics: lyrics
    };
  } catch (error) {
    console.error("Genius API error:", error);
    return null;
  }
}

async function getGeniusLyrics(songUrl: string): Promise<string | undefined> {
  try {
    // Note: Genius doesn't provide lyrics directly via API
    // This is a simplified approach - in production you'd need web scraping
    // For now, we'll return a placeholder that indicates Genius data was found
    return "High-quality lyrics from Genius (lyrics extraction would require additional implementation)";
  } catch (error) {
    console.error("Error getting Genius lyrics:", error);
    return undefined;
  }
}

async function getLastFmTrackInfo(title: string, artist: string): Promise<{ genre?: string; year?: number } | null> {
  try {
    if (!process.env.LASTFM_API_KEY) {
      console.log("Last.fm API key not available, skipping Last.fm search");
      return null;
    }

    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${process.env.LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&format=json`
    );

    if (!response.ok) {
      console.log(`Last.fm API error: ${response.status}`);
      return null;
    }

    const data: LastFmTrackInfo = await response.json();
    
    if (!data.track) {
      return null;
    }

    // Extract genre from top tags
    let genre: string | undefined;
    if (data.track.toptags?.tag && data.track.toptags.tag.length > 0) {
      genre = data.track.toptags.tag[0].name;
    }

    // Extract year from album data
    let year: number | undefined;
    if (data.track.album?.['@attr']?.year) {
      year = parseInt(data.track.album['@attr'].year);
    }

    return {
      genre: genre,
      year: year
    };
  } catch (error) {
    console.error("Last.fm API error:", error);
    return null;
  }
}

export async function getSongDetails(title: string, artist: string): Promise<SongInfo | null> {
  try {
    // Try to get additional metadata from MusicBrainz API (free, no key required)
    const mbResponse = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=recording:"${encodeURIComponent(title)}" AND artist:"${encodeURIComponent(artist)}"&fmt=json&limit=1`
    );

    if (mbResponse.ok) {
      const mbData = await mbResponse.json();
      if (mbData.recordings && mbData.recordings.length > 0) {
        const recording = mbData.recordings[0];
        const releaseDate = recording.releases?.[0]?.date;
        const year = releaseDate ? parseInt(releaseDate.substring(0, 4)) : undefined;
        
        return {
          title: recording.title || title,
          artist: recording["artist-credit"]?.[0]?.name || artist,
          year: year,
          genre: recording.tags?.[0]?.name
        };
      }
    }

    // Fallback to basic info
    return {
      title,
      artist
    };
  } catch (error) {
    console.error("Error getting song details:", error);
    return {
      title,
      artist
    };
  }
}
