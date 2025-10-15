import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { z } from "zod";

const memory = new MemorySaver();

const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";
const tools = [""];

const ResponseFormatSchema = z.object({
  status: z
    .enum(["input_required", "completed", "error"])
    .default("input_required"),
  message: z.string(),
});

/* 

*/
class PolymarketAgent {
  private model: ChatGoogleGenerativeAI;
  private tools: any[];
  private graph: any;

  SUPPORTED_CONTENT_TYPES = ["text", "text/plain"];

  SYSTEM_INSTRUCTION =
    "You are a specialized Polymarket market data assistant powered by Polymarket's API. " +
    "Your expertise is in helping users discover prediction markets on Polymarket. " +
    "\n\n" +
    "## Your Capabilities:\n" +
    "1. **Market Discovery**: Search and browse active prediction markets\n" +
    "2. **Market Categories**: Help users find markets by topic (politics, crypto, sports, etc.)\n" +
    "3. **Market Details**: Explain market rules, outcomes, and resolution criteria\n" +
    "\n\n" +
    "## Data Sources:\n" +
    "- Gamma API: Market metadata and event information\n" +
    "\n\n" +
    "## Important Guidelines:\n" +
    "- Always provide objective market data without making trading recommendations\n" +
    "\n\n" +
    "## Response Format:\n" +
    "- Set status to 'input_required' if you need more information from the user\n" +
    "- Set status to 'error' if there's an API error or invalid request\n" +
    "- Set status to 'completed' when the request is successfully fulfilled\n" +
    "\n\n" +
    "## Out of Scope:\n" +
    "- You cannot place trades or execute orders\n" +
    "- You cannot provide financial advice or trading strategies\n" +
    "- You cannot access user portfolios or personal account data\n" +
    "- You should not make predictions or express opinions about market outcomes\n" +
    "\n\n" +
    "Be concise, accurate, and helpful. Format market data in easy-to-read tables or lists when appropriate.";

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
    });

    // Tools will be implemented later
    this.tools = tools;

    this.graph = createAgent({
      model: this.model,
      tools: this.tools,
      checkpointer: memory,
      prompt: this.SYSTEM_INSTRUCTION,
      responseFormat: ResponseFormatSchema,
    });
  }

  async invoke(query: string, contextId: any) {
    const config = { configurable: { thread_id: contextId } };
    const timestamp = new Date().toISOString();
    const augmentedQuery = `Current timestamp: ${timestamp}\n\nUser query: ${query}`;

    await this.graph.invoke(
      { messages: [{ role: "user", content: augmentedQuery }] },
      config
    );
    return this.getAgentResponse(config);
  }

  async *stream(query: string, contextId: any) {
    const timestamp = new Date().toISOString();
    const augmentedQuery = `Current timestamp: ${timestamp}\n\nUser query: ${query}`;
    const inputs = { messages: [{ role: "user", content: augmentedQuery }] };
    const config = { configurable: { thread_id: contextId } };

    for await (const item of this.graph.stream(inputs, config, {
      streamMode: "values",
    })) {
      const message = item.messages[item.messages.length - 1];
      if (
        message instanceof AIMessage &&
        message.tool_calls &&
        message.tool_calls.length > 0
      ) {
        yield {
          is_task_complete: false,
          require_user_input: false,
          content: "Fetching market data from Polymarket...",
        };
      } else if (message instanceof ToolMessage) {
        yield {
          is_task_complete: false,
          require_user_input: false,
          content: "Processing market information...",
        };
      }
    }

    yield this.getAgentResponse(config);
  }

  getAgentResponse(config: any) {
    const currentState = this.graph.getState(config);
    const structuredResponse = currentState.values.structured_response;

    if (structuredResponse && structuredResponse.status) {
      if (structuredResponse.status === "input_required") {
        return {
          is_task_complete: false,
          require_user_input: true,
          content: structuredResponse.message,
        };
      }
      if (structuredResponse.status === "error") {
        return {
          is_task_complete: false,
          require_user_input: true,
          content: structuredResponse.message,
        };
      }
      if (structuredResponse.status === "completed") {
        return {
          is_task_complete: true,
          require_user_input: false,
          content: structuredResponse.message,
        };
      }
    }

    return {
      is_task_complete: false,
      require_user_input: true,
      content:
        "Unable to process your market data request at the moment. " +
        "Please try again or rephrase your query.",
    };
  }
}

export { PolymarketAgent };
