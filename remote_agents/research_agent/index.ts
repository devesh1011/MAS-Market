import express from "express";
import type { AgentCard } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { ResearchAgentExecutor } from "./agentExecutor.js";
import { configDotenv } from "dotenv";

configDotenv();

const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Define the Prediction Market Research Agent's identity card
const researchAgentCard: AgentCard = {
  name: "Prediction Market Research Agent",
  description:
    "An AI agent specialized in analyzing prediction market events (e.g., Polymarket). Conducts thorough research on events, provides evidence-based recommendations (Yes/No), and helps users make informed decisions instead of blind speculation. Analyzes current developments, historical context, key factors, and risks to deliver actionable insights.",
  protocolVersion: "0.3.0",
  version: "1.0.0",
  url: BASE_URL,
  skills: [
    {
      id: "prediction-market-analysis",
      name: "Prediction Market Analysis",
      description:
        "Analyze prediction market events, research outcomes, assess probabilities, and provide Yes/No recommendations with confidence levels. Helps users understand events deeply before making decisions.",
      tags: [
        "prediction-markets",
        "research",
        "analysis",
        "polymarket",
        "event-analysis",
        "decision-support",
      ],
    },
  ],
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain", "text/markdown"],
};

// Set up the agent executor and request handler
const agentExecutor = new ResearchAgentExecutor();
const taskStore = new InMemoryTaskStore();
const requestHandler = new DefaultRequestHandler(
  researchAgentCard,
  taskStore,
  agentExecutor
);

// Set up Express app with A2A routes
const appBuilder = new A2AExpressApp(requestHandler);
const app = appBuilder.setupRoutes(express());

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Research Agent Server started on ${BASE_URL}`);
  console.log(`📋 Agent Card: ${BASE_URL}/.well-known/agent-card.json`);
  console.log(
    `🔍 Skills: ${researchAgentCard.skills.map((s) => s.name).join(", ")}`
  );
});

export { researchAgentCard, agentExecutor };
