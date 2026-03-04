
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client using the environment variable directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askCosmoAssistant = async (query: string, fileContext: any[]) => {
  try {
    // Generate content using the recommended model for basic text and Q&A tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is a teacher using ICAN CosmoDrive (a cosmic-themed NAS file explorer). 
      Available files in current directory: ${JSON.stringify(fileContext)}.
      User query: "${query}"
      Answer as a helpful "Cosmo Assistant" with a slight space/futuristic flair.`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      },
    });

    // Access the .text property directly from the response.
    return response.text || "I'm having trouble connecting to the nebula. Please try again later.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error navigating the asteroid field. Please check your connection.";
  }
};
