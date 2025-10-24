import express from "express";
import type { AgentCard, AgentSkill, AgentCapabilities } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { PolymarketAgentExecutor } from "./agentExecutor.ts";
import { configDotenv } from "dotenv";

configDotenv();

const HOST = "localhost";
const PORT = 8001;

async function main() {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("API KEY not found");
    }

    const agentskill: AgentSkill = {
      id: "polymarket_data_fetch",
      name: "Polymarket Data fetching Tool",
      description: "Helps with fetching Polymarket data",
      tags: ["polymarket", "data"],
      examples: ["Fetch latest Polymarket data"],
    };

    const capabilities: AgentCapabilities = {
      pushNotifications: true,
      streaming: true,
    };

    const polymarketAgentCard: AgentCard = {
      name: "Polymarket Agent",
      description: "Helps with fetching Polymarket data",
      url: `http://${HOST}:${PORT}/`,
      version: "1.0.0",
      capabilities: capabilities,
      skills: [agentskill],
      defaultInputModes: [],
      defaultOutputModes: [],
      protocolVersion: "",
    };

    const agentExecutor = new PolymarketAgentExecutor();
    const requestHandler = new DefaultRequestHandler(
      polymarketAgentCard,
      new InMemoryTaskStore(),
      agentExecutor
    );

    const appBuilder = new A2AExpressApp(requestHandler);
    const app = express();
    const expressApp = appBuilder.setupRoutes(app);

    expressApp.listen(PORT, () => {
      console.log(`🚀 Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

await main();
