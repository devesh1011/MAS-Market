import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import "dotenv/config";
import { internetSearch } from "./tools.js";

// Define the response schema for market research
const ResearchResponseSchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise summary of the analysis with key reasoning (2-3 sentences)"
    ),
  what_to_bet: z
    .enum(["yes", "no", "insufficient_data"])
    .describe("The recommendation: 'yes', 'no', or 'insufficient_data'"),
});

type ResearchResponse = z.infer<typeof ResearchResponseSchema>;

/**
 * Market Research Agent using LangChain's createAgent
 * Fast, focused research on prediction market events
 */
class MarketResearchAgent {
  private agent: any;

  constructor() {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.5,
    });

    // System prompt for focused market research
    const systemPrompt = `You are an expert prediction market analyst. Your job is to quickly analyze prediction market events and provide clear, evidence-based recommendations.

## Your Task
When given a market event, you must:
1. Understand the exact event question and resolution criteria
2. Search for relevant current information and recent developments
3. Analyze the information objectively
4. Provide a clear YES/NO recommendation based on available evidence, or INSUFFICIENT_DATA if there's not enough information

## Important Guidelines
- Be concise and direct in your analysis
- Only use SUFFICIENT_DATA if you have found relevant, recent information
- Consider both supporting and opposing evidence
- Use the internet_search tool to find current information
- Focus on objective facts, not speculation
- If critical information is unavailable, clearly state this

## Response Format
You MUST respond with a JSON object containing:
{
  "summary": "2-3 sentence explanation of your recommendation with key evidence",
  "what_to_bet": "yes" OR "no" OR "insufficient_data"
}

The summary should be clear, concise, and include the most important reasoning. The user will only see this JSON response.`;

    this.agent = createAgent({
      model,
      tools: [internetSearch],
      systemPrompt,
      responseFormat: ResearchResponseSchema,
    });
  }

  async invoke(params: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<ResearchResponse> {
    try {
      const result = await this.agent.invoke({
        messages: params.messages,
      });

      // Extract structured response
      if (result.structuredResponse) {
        return result.structuredResponse as ResearchResponse;
      }

      // Fallback: try to parse from content
      if (result.content) {
        try {
          const parsed = JSON.parse(
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content)
          );
          return {
            summary: parsed.summary || "Unable to generate summary",
            what_to_bet: parsed.what_to_bet || "insufficient_data",
          };
        } catch (e) {
          // If JSON parsing fails, extract from message
          console.error("Failed to parse structured response:", e);
        }
      }

      // Last resort response
      return {
        summary:
          "Unable to complete analysis. Please try again with a more specific market question.",
        what_to_bet: "insufficient_data",
      };
    } catch (error) {
      console.error("Error invoking agent:", error);
      throw error;
    }
  }
}

export { MarketResearchAgent, ResearchResponseSchema, type ResearchResponse };
