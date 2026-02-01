import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export class AiService {
    private static genAI = env.GOOGLE_API_KEY ? new GoogleGenerativeAI(env.GOOGLE_API_KEY) : null;

    /**
     * Processes a voice message to extract transaction details.
     */
    static async processVoiceTransaction(
        audioBuffer: Buffer,
        mimeType: string,
        context: { projects: string[], categories: string[] }
    ) {
        if (!this.genAI) {
            throw new Error("GOOGLE_API_KEY is not configured. Please add it to your .env file.");
        }

        const model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
      You are a financial assistant for a construction company "СтройУчёт". 
      Analyze the provided audio recording (in Russian) and extract transaction details.
      
      IMPORTANT:
      - Available Projects: ${context.projects.join(", ")}
      - Available Categories: ${context.categories.join(", ")}
      
      OUTPUT JSON STRUCTURE:
      {
        "amount": number | null,
        "projectName": "exact string matching one of the available projects or null",
        "categoryName": "exact string matching one of the available categories or null",
        "comment": "brief Russian description of the expense",
        "type": "EXPENSE" | "INCOME"
      }
      
      RULES:
      1. If the amount is mentioned, convert it to a number (e.g., "пятьсот" -> 500).
      2. "projectName" MUST match one of the items in the "Available Projects" list if mentioned.
      3. "categoryName" MUST match one of the items in the "Available Categories" list if mentioned.
      4. If a field is missing or unclear, set it to null.
      5. The "comment" should be a concise summary of what was purchased or received.
      6. Default type is "EXPENSE" unless "доход" or "приход" is clearly mentioned.
    `;

        try {
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: audioBuffer.toString("base64"),
                        mimeType: mimeType
                    }
                }
            ]);

            let responseText = result.response.text();

            // Clean up Markdown code blocks if present
            responseText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

            return JSON.parse(responseText);
        } catch (error: any) {
            console.error("AI_SERVICE_ERROR_FULL:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            logger.error("AI Voice Processing Error", { error: error.message });
            throw error;
        }
    }
}
