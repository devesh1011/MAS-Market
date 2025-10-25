import { AIMessage, ToolMessage, HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";
import { z } from "zod";
import { getActiveEvents } from "./tools";
import { SYSTEM_INSTRUCTION } from "./instructions";

const memory = new MemorySaver();

class PolymarketAgent {
  private model: ChatGoogleGenerativeAI;
  private tools: any[];
  private agent: any;

  SUPPORTED_CONTENT_TYPES = ["text", "text/plain"];

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0,
    });

    this.tools = [getActiveEvents];

    this.agent = createAgent({
      model: this.model,
      tools: this.tools,
      checkpointer: memory,
      systemPrompt: SYSTEM_INSTRUCTION,
    });
  }

  async invoke(query: string, contextId: any) {
    const config = { configurable: { thread_id: contextId } };

    console.log("[PolymarketAgent.invoke] Starting with query:", query);
    console.log(
      "[PolymarketAgent.invoke] Available tools:",
      this.tools.map((t: any) => t.name || "unknown")
    );

    try {
      const result = await this.agent.invoke(
        { messages: [new HumanMessage({ content: query })] },
        config
      );
      console.log(result);
      console.log("[PolymarketAgent.invoke] Invoke completed");
      console.log("[PolymarketAgent.invoke] Result type:", typeof result);
      console.log(
        "[PolymarketAgent.invoke] Result keys:",
        result ? Object.keys(result) : "null"
      );
      console.log(
        "[PolymarketAgent.invoke] Result messages count:",
        result?.messages?.length || 0
      );
      return this.getAgentResponse(result);
    } catch (error) {
      console.error("[PolymarketAgent.invoke] Error during invoke:", error);
      throw error;
    }
  }

  async *stream(query: string, contextId: any) {
    const config = { configurable: { thread_id: contextId } };

    console.log("[PolymarketAgent.stream] Starting stream with query:", query);

    try {
      // Run invoke to completion (don't stream intermediate steps)
      console.log("[PolymarketAgent.stream] Running agent.invoke...");
      const result = await this.agent.invoke(
        { messages: [new HumanMessage({ content: query })] },
        config
      );

      console.log(
        "[PolymarketAgent.stream] Invoke complete, yielding response"
      );

      // Yield only the final response
      yield this.getAgentResponse(result);
    } catch (error) {
      console.error("Stream error:", error);
      yield {
        is_task_complete: false,
        require_user_input: false,
        content: "Error processing request.",
      };
    }
  }

  getAgentResponse(state: any) {
    try {
      // State can be the result from invoke() or from getState()
      const finalState = state.values || state || {};
      const messages = finalState.messages || [];

      console.log(
        "[PolymarketAgent.getAgentResponse] Processing",
        messages.length,
        "messages"
      );

      if (messages.length > 0) {
        // Get the last AI message - messages are deserialized LangChain message objects
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];

          // Look for AIMessage - check constructor name
          if (msg.constructor?.name === "AIMessage") {
            const content = msg.content;

            // Extract text content
            if (typeof content === "string") {
              console.log(
                "[PolymarketAgent.getAgentResponse] Returning AI response"
              );
              return {
                is_task_complete: true,
                require_user_input: false,
                content: content,
              };
            } else if (Array.isArray(content)) {
              // Filter out tool calls and get text content
              const textContent = content
                .filter(
                  (c: any) =>
                    typeof c === "string" || (c.type === "text" && c.text)
                )
                .map((c: any) => (typeof c === "string" ? c : c.text))
                .join("\n");

              if (textContent) {
                console.log(
                  "[PolymarketAgent.getAgentResponse] Returning formatted AI response"
                );
                return {
                  is_task_complete: true,
                  require_user_input: false,
                  content: textContent,
                };
              }
            }
          }
        }
      }

      console.log(
        "[PolymarketAgent.getAgentResponse] No AI message found, returning fallback"
      );
      return {
        is_task_complete: false,
        require_user_input: true,
        content:
          "Unable to process your market data request at the moment. " +
          "Please try again or rephrase your query.",
      };
    } catch (error) {
      console.error("[PolymarketAgent] Error in getAgentResponse:", error);
      return {
        is_task_complete: false,
        require_user_input: true,
        content: "Error processing request: " + String(error),
      };
    }
  }
}

export { PolymarketAgent };
