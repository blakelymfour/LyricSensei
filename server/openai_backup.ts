import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "default_key"
});

export interface LyricsAnalysis {
  meaning: string;
  themes: string[];
  mood: string;
  interpretation: string;
}

export async function analyzeLyrics(
  songTitle: string,
  artist: string,
  lyrics: string
): Promise<LyricsAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Adopt the voice of a seasoned lyricist and literary critic. Imagine you’ve spent years dissecting songs from all eras and all music genres. Your tone should be thoughtful, precise, direct—no fluff and no vague generalities. Your goal is to provide deep, insightful analysis of song lyrics.  Respond with JSON in this exact format:
          {
            "meaning": "A summary explanation of the song's overall message",
            "themes": ["array", "of", "main", "themes"],
            "mood": "overall emotional tone/mood",
            "interpretation": "deeper artistic interpretation and context"
          }`
        },
        {
          role: "user",
          content: `Analyze the lyrics of "${songTitle}" by ${artist}. Here are the lyrics:\n\n${lyrics}\n\n Provide thoughtful analysis of the meaning, themes, mood, and interpretation of these lyrics.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      meaning: result.meaning || "Unable to analyze the meaning of this song.",
      themes: Array.isArray(result.themes) ? result.themes : [],
      mood: result.mood || "Unknown",
      interpretation: result.interpretation || "No additional interpretation available."
    };
  } catch (error) {
    console.error("Error analyzing lyrics with OpenAI:", error);
    throw new Error("Failed to analyze lyrics: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

export async function generateSongMeaning(
  songTitle: string,
  artist: string,
  genre?: string,
  year?: number
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Adopt the voice of a seasoned lyricist and literary critic. Provide a meaningful analysis of songs based on the song title, artist, and its genre. Focus on themes, and artistic interpretation. Write a standalone and concise paragraph that captures the core “meaning” of the lyrics—the big takeaway that a listener might have on a first or second listen. This paragraph should be polished enough to stand alone and show up directly in the application under a heading like “What This Song Means."
          

          
        },
        {
          role: "user",
          content: `Analyze the song "${songTitle}" by ${artist}${genre ? ` (${genre})` : ""}${year ? ` from ${year}` : ""}. Provide a summary explanation of its meaning and themes.`
        }
      ],
      max_tokens: 400
    });

    return response.choices[0].message.content || "Unable to generate analysis for this song.";
  } catch (error) {
    console.error("Error generating lyrics analysis:", error);
    throw new Error("Failed to generate lyrics meaning: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}
