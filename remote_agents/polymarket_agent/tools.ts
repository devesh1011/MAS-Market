import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Tool: Get all active events from Polymarket API
export const getActiveEvents = tool(
  async () => {
    /**
     * Fetches all active market events/series from Polymarket.
     * Returns the raw JSON data from the /series endpoint.
     */
    try {
      const response = await fetch("https://gamma-api.polymarket.com/series");

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.status} - Failed to fetch series`
        );
      }

      const data = await response.json();

      // Filter only active events
      const activeEvents = data.filter((series: any) => series.active === true);

      return JSON.stringify(activeEvents, null, 2);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Polymarket API Error: ${error.message}`);
      }
      throw error;
    }
  },
  {
    name: "get_active_events",
    description:
      "Fetches all active market events and series from Polymarket API. Returns complete JSON data including event details, markets, tags, and metadata.",
    schema: z.object({}),
  }
);
