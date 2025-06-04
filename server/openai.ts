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
          content: `Adopt the voice of a seasoned lyricist and literary critic. Imagine you've spent years dissecting songs from all eras and all music genres. Your tone should be thoughtful, precise, direct—no fluff and no vague generalities. Your goal is to provide deep, insightful analysis of song lyrics.  Respond with JSON in this exact format:
          {
            "meaning": "A comprehensive explanation of the song's overall meaning and message",
            "themes": ["array", "of", "main", "themes"],
            "mood": "overall emotional tone/mood",
            "interpretation": "deeper artistic interpretation and context"
          }`
        },
        {
          role: "user",
          content: `Analyze the lyrics of "${songTitle}" by ${artist}. Here are the lyrics:\n\n${lyrics}\n\nProvide a thoughtful analysis of the song's meaning, themes, mood, and interpretation.`
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
          content: `Adopt the voice of a seasoned lyricist and literary critic; Your goal is to provide original and insightful analysis of song lyrics'

METADATA EXTRACTION: 
- If the user input contains both the song and artist (e.g., "Bohemian Rhapsody Queen" or "Hotel California by Eagles"), extract clean song title and name of the artist and return separately
- Always return the accurate genre and release year from the metadata
- Format metadata as shown here: Genre: [genre], Release Year: [year]

ANALYSIS FORMAT - Start directly with these headers, no introduction:

## Core Theme
Identify the primary message in the lyrics (1-2 sentences)

## Emotional Tone  
Describe predominant moods and emotional journey

## Key Symbolism
Highlight 2-3 important metaphors, imagery, or recurring motifs

## Personal or Universal?
Note whether the message is autobiographical or intended to be broadly relatable

End your analysis with this exact format:
Genre: [actual genre]
Release Year: [actual year]

IMPORTANT: Do not include "Analysis of..." headers. Focus on providing accurate metadata from your knowledge.`
        },
        {
          role: "user",
          content: `Analyze the song "${songTitle}" by ${artist}${genre ? ` (${genre})` : ""}${year ? ` from ${year}` : ""}. 

Use your knowledge to provide accurate genre and release year information for this song in your analysis. Follow the exact format specified in the system prompt starting with "## Core Theme". Do not include any title header or "Analysis of..." text.`
        }
      ],
      max_tokens: 400
    });

    return response.choices[0].message.content || "Unable to generate analysis for this song.";
  } catch (error) {
    console.error("Error generating song meaning with OpenAI:", error);
    throw new Error("Failed to generate song meaning: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}