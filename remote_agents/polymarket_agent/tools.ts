import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Constants
const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";

// Type definitions
interface Tag {
  id: string;
  label: string;
  slug: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Market {
  id: string;
  question: string;
  description?: string;
  tags?: Tag[];
  outcomes?: string[];
  endDate?: string;
  liquidityUSD?: number;
  volumeUSD?: number;
}

interface PolymarketAPIError {
  error: string;
  statusCode: number;
  message?: string;
}

// Helper function to make API requests
async function fetchFromPolymarket(
  endpoint: string,
  queryParams?: Record<string, string | number>
): Promise<any> {
  try {
    let url = `${POLYMARKET_API_BASE}${endpoint}`;

    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error: PolymarketAPIError = {
        error: `API Error: ${response.status}`,
        statusCode: response.status,
        message: `Failed to fetch ${endpoint}`,
      };
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Polymarket API Error: ${error.message}`);
    }
    throw error;
  }
}

// Tool 1: Get all market tags/categories
export const getMarketTags = tool(
  async () => {
    /**
     * Fetches all available market tags/categories from Polymarket.
     * Tags represent different event categories like "politics", "crypto", "sports", etc.
     */
    try {
      const tags = await fetchFromPolymarket("/tags");

      // Sort tags alphabetically by label for better UX
      const sortedTags = tags.sort((a: Tag, b: Tag) =>
        a.label.localeCompare(b.label)
      );

      return {
        success: true,
        data: sortedTags,
        count: sortedTags.length,
        message: `Found ${sortedTags.length} available market categories`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: [],
        count: 0,
      };
    }
  },
  {
    name: "get_market_tags",
    description:
      "Get all available market tags/categories from Polymarket. Tags represent different event categories like politics, crypto, sports, etc. Users can use these tags to filter and discover markets.",
    schema: z.object({}), // No parameters required
  }
);

// Tool 2: Search markets by tag
export const searchMarketsByTag = tool(
  async ({ tagSlug, limit = 10, offset = 0 }: SearchMarketsByTagParams) => {
    /**
     * Search for markets within a specific tag/category.
     * Returns active prediction markets matching the given tag.
     */
    try {
      if (!tagSlug || tagSlug.trim() === "") {
        return {
          success: false,
          error: "Tag slug is required",
          data: [],
          count: 0,
        };
      }

      const markets = await fetchFromPolymarket("/markets", {
        tag: tagSlug,
        limit,
        offset,
      });

      return {
        success: true,
        data: markets,
        count: markets.length,
        pagination: {
          limit,
          offset,
          hasMore: markets.length === limit,
        },
        message: `Found ${markets.length} markets for tag: ${tagSlug}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: [],
        count: 0,
      };
    }
  },
  {
    name: "search_markets_by_tag",
    description:
      "Search for prediction markets within a specific category/tag. Returns a list of active markets related to the given tag. Useful for browsing markets by topic (e.g., 'politics', 'crypto', 'sports').",
    schema: z.object({
      tagSlug: z
        .string()
        .describe(
          "The tag slug to search within (e.g., 'politics', 'crypto', 'sports'). Use lowercase, hyphenated format."
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe(
          "Maximum number of markets to return (default: 10, max: 100)"
        ),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Number of markets to skip for pagination (default: 0)"),
    }),
  }
);

// Tool 3: Get market details
export const getMarketDetails = tool(
  async ({ marketId }: GetMarketDetailsParams) => {
    /**
     * Get detailed information about a specific market.
     * Includes question, outcomes, liquidity, volume, and other metadata.
     */
    try {
      if (!marketId || marketId.trim() === "") {
        return {
          success: false,
          error: "Market ID is required",
          data: null,
        };
      }

      const market = await fetchFromPolymarket(`/markets/${marketId}`);

      return {
        success: true,
        data: market,
        message: "Market details retrieved successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      };
    }
  },
  {
    name: "get_market_details",
    description:
      "Get detailed information about a specific prediction market including the market question, possible outcomes, resolution criteria, liquidity, trading volume, and other metadata. Use this to show users comprehensive market information before they decide to participate.",
    schema: z.object({
      marketId: z
        .string()
        .describe(
          "The unique identifier of the market (UUID format from Polymarket)"
        ),
    }),
  }
);

// Tool 4: Search markets by keywords
export const searchMarketsByKeyword = tool(
  async ({ keyword, limit = 10, offset = 0 }: SearchMarketsByKeywordParams) => {
    /**
     * Search for markets using keyword/full-text search.
     * Returns markets where the question or description matches the keyword.
     */
    try {
      if (!keyword || keyword.trim() === "") {
        return {
          success: false,
          error: "Search keyword is required",
          data: [],
          count: 0,
        };
      }

      const markets = await fetchFromPolymarket("/markets", {
        search: keyword,
        limit,
        offset,
      });

      return {
        success: true,
        data: markets,
        count: markets.length,
        pagination: {
          limit,
          offset,
          hasMore: markets.length === limit,
        },
        message: `Found ${markets.length} markets matching: "${keyword}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: [],
        count: 0,
      };
    }
  },
  {
    name: "search_markets_by_keyword",
    description:
      "Search for prediction markets using keywords or phrases. Searches across market questions and descriptions. Useful when users are looking for specific events or topics.",
    schema: z.object({
      keyword: z
        .string()
        .min(1)
        .describe("Search keyword or phrase to find relevant markets"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe(
          "Maximum number of markets to return (default: 10, max: 100)"
        ),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Number of markets to skip for pagination (default: 0)"),
    }),
  }
);

// Tool 5: Get Events with detailed market information
export const getEvents = tool(
  async ({ category, limit = 10, offset = 0 }: GetEventsParams) => {
    /**
     * Get prediction market events with detailed information including nested markets and series.
     * Events are "parent" entities that contain multiple markets and series information.
     */
    try {
      const queryParams: Record<string, string | number> = {
        limit,
        offset,
      };

      if (category && category.trim() !== "") {
        queryParams.category = category;
      }

      const events = await fetchFromPolymarket("/events", queryParams);

      // Transform events to a user-friendly format
      const transformedEvents = events.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        slug: event.slug,
        image: event.image,
        active: event.active,
        closed: event.closed,
        volume: event.volume,
        liquidity: event.liquidity,
        endDate: event.endDate,
        startDate: event.startDate,
        resolutionSource: event.resolutionSource,
        marketCount: event.markets?.length || 0,
        markets:
          event.markets?.map((market: any) => ({
            id: market.id,
            question: market.question,
            liquidity: market.liquidity,
            volume: market.volume,
            active: market.active,
            closed: market.closed,
            outcomes: market.outcomes ? JSON.parse(market.outcomes) : [],
            outcomePrices: market.outcomePrices
              ? JSON.parse(market.outcomePrices)
              : [],
          })) || [],
        series:
          event.series?.map((s: any) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            recurrence: s.recurrence,
          })) || [],
        tags:
          event.tags?.map((t: any) => ({
            id: t.id,
            label: t.label,
            slug: t.slug,
          })) || [],
      }));

      return {
        success: true,
        data: transformedEvents,
        count: transformedEvents.length,
        pagination: {
          limit,
          offset,
          hasMore: transformedEvents.length === limit,
        },
        message: `Found ${transformedEvents.length} prediction market events${
          category ? ` in ${category}` : ""
        }`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: [],
        count: 0,
      };
    }
  },
  {
    name: "get_events",
    description:
      "Get prediction market events with comprehensive details including nested markets, series information, and trading data. Events are parent entities containing multiple prediction markets on the same topic. Returns event title, description, all associated markets with outcomes and prices, series metadata, and trading volume/liquidity. Useful for getting a complete view of all markets related to a specific event.",
    schema: z.object({
      category: z
        .string()
        .optional()
        .describe(
          "Filter events by category (e.g., 'Sports', 'Politics', 'Crypto', 'Entertainment'). Leave empty to get all categories."
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of events to return (default: 10, max: 100)"),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe("Number of events to skip for pagination (default: 0)"),
    }),
  }
);

// Type definitions for tool parameters
interface SearchMarketsByTagParams {
  tagSlug: string;
  limit?: number;
  offset?: number;
}

interface GetMarketDetailsParams {
  marketId: string;
}

interface SearchMarketsByKeywordParams {
  keyword: string;
  limit?: number;
  offset?: number;
}

interface GetEventsParams {
  category?: string;
  limit?: number;
  offset?: number;
}

// Export all tools as an array for easy integration
export const polymarketTools = [
  getMarketTags,
  searchMarketsByTag,
  getMarketDetails,
  searchMarketsByKeyword,
  getEvents,
];

// Export tool descriptions for agent documentation
export const toolDescriptions = {
  get_market_tags:
    "Retrieve all available market categories/tags for browsing and filtering",
  search_markets_by_tag:
    "Find prediction markets within a specific category or topic",
  get_market_details:
    "Get comprehensive information about a specific prediction market",
  search_markets_by_keyword:
    "Search for markets using free-text keywords or phrases",
  get_events:
    "Get prediction market events with all nested markets, series data, and trading information",
};
