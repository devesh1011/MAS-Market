import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

type Topic = "general" | "news" | "finance";

/**
 * Internet search tool for market research
 * Uses Tavily Search API to find relevant information about market events
 */
const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general" as Topic,
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: Topic;
    includeRawContent?: boolean;
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });

    const tavilyResponse = await tavilySearch.invoke({ query });
    return tavilyResponse;
  },
  {
    name: "internet_search",
    description:
      "Search the internet for information about market events, current news, and relevant data for prediction market analysis",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query - be specific about what information you need"
        ),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of search results to return (1-20)"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe(
          "Search topic category: 'general' for general info, 'news' for news, 'finance' for financial data"
        ),
      includeRawContent: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include raw page content in results"),
    }),
  }
);

export { internetSearch };
