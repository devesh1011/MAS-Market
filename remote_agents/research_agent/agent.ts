/* eslint-disable no-console */
import { createDeepAgent, type SubAgent } from "@devesh1011/deep-agent";
import { tool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";
import { TavilySearch } from "@langchain/tavily";
import {
  researchInstructions,
  subCritiquePrompt,
  subResearchPrompt,
} from "./instructions";
import { configDotenv } from "dotenv";

configDotenv();

type Topic = "general" | "news" | "finance";

// Search tool to use to do research
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
    /**
     * Run a web search
     */

    // Note: You'll need to install and import tavily-js or similar package
    // For now, this is a placeholder that shows the structure
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
    description: "Run a web search",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("Search topic category"),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include raw content"),
    }),
  }
);

class MarketResearchAgent {
  researchSubAgent: SubAgent;
  critiqueSubAgent: SubAgent;
  agent: any;
  constructor() {
    this.researchSubAgent = {
      name: "research-agent",
      description:
        "Used to research more in depth questions. Only give this researcher one topic at a time. Do not pass multiple sub questions to this researcher. Instead, you should break down a large topic into the necessary components, and then call multiple research agents in parallel, one for each sub question.",
      prompt: subResearchPrompt,
      tools: ["internet_search"],
    };

    this.critiqueSubAgent = {
      name: "critique-agent",
      description:
        "Used to critique the final report. Give this agent some infomration about how you want it to critique the report.",
      prompt: subCritiquePrompt,
    };

    this.agent = createDeepAgent({
      tools: [internetSearch],
      instructions: researchInstructions,
      subagents: [this.critiqueSubAgent, this.researchSubAgent],
    }).withConfig({ recursionLimit: 1000 });
  }

  async invoke(params: { messages: Array<{ role: string; content: string }> }) {
    try {
      const result = await this.agent.invoke({
        messages: params.messages,
      });
      console.log(result);
      return result;
    } catch (error) {
      console.error("Error invoking agent:", error);
      throw error;
    }
  }
}

export { MarketResearchAgent };
