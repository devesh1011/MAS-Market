import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent } from "langchain";
import { BETTOR_AGENT_INSTRUCTIONS } from "./instructions.js";
import { bettorTools } from "./tools.js";

export class BettorAgent {
  private agent: any;
  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY environment variable is required");
    }

    // Initialize Google Gemini model
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.0-flash",
      temperature: 0.3, // Lower temperature for more deterministic bet execution
    });

    // Create ReAct agent with tools
    this.agent = createAgent({
      model: model,
      tools: bettorTools,
      systemPrompt: BETTOR_AGENT_INSTRUCTIONS,
    });
  }

  async invoke(input: { messages: Array<{ role: string; content: string }> }) {
    try {
      // Format input for LangGraph
      const formattedMessages = input.messages.map((msg) => ({
        role: msg.role === "user" ? "human" : "ai",
        content: msg.content,
      }));

      // Add system instructions as first message
      const messagesWithInstructions = [
        { role: "system", content: BETTOR_AGENT_INSTRUCTIONS },
        ...formattedMessages,
      ];

      // Invoke agent
      const result = await this.agent.invoke({
        messages: messagesWithInstructions,
      });

      // Extract final response
      if (result && result.messages && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1];
        return lastMessage.content;
      }

      return "No response generated";
    } catch (error) {
      console.error("Bettor agent error:", error);
      throw error;
    }
  }
}
