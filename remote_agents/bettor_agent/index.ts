import express from "express";
import type { AgentCard, AgentSkill, AgentCapabilities } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { BettorAgentExecutor } from "./agentExecutor.js";
import { configDotenv } from "dotenv";

configDotenv();

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "8003");
const BASE_URL = process.env.BASE_URL || `http://${HOST}:${PORT}`;

async function main() {
  try {
    // Validate environment variables
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not found");
    }

    if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
      console.warn(
        "⚠️  Hedera credentials not configured. Some features may not work."
      );
    }

    // Define agent skills
    const betExecutionSkill: AgentSkill = {
      id: "bet_execution",
      name: "Bet Execution via x402",
      description:
        "Places bets on prediction markets using x402 payment protocol. Handles payment requests, bet recording on Hedera smart contracts, and transaction confirmation.",
      tags: ["betting", "x402", "payments", "hedera"],
      examples: [
        "Place a bet of 100 HBAR on YES for market: Will Trump win 2024?",
        "Bet 50 HBAR on NO for market: Will Bitcoin reach $100k by EOY?",
      ],
    };

    const payoutSkill: AgentSkill = {
      id: "payout_management",
      name: "Payout Management",
      description:
        "Monitors market resolutions and automatically triggers x402 payouts to winning users. Queries smart contract for winners and executes payouts.",
      tags: ["payouts", "settlement", "x402", "hedera"],
      examples: [
        "Check if market [id] is resolved and trigger payouts",
        "Get winning bets for resolved market [id]",
      ],
    };

    const capabilities: AgentCapabilities = {
      pushNotifications: true, // For payout notifications
      streaming: false,
    };

    // Define Agent Card
    const bettorAgentCard: AgentCard = {
      name: "Bettor Agent",
      description:
        "Executes betting transactions and manages payouts on prediction markets using x402 payment protocol on Hedera blockchain. Handles bet placement, payment requests, smart contract interactions, market resolution monitoring, and automated payout distribution.",
      url: BASE_URL,
      version: "1.0.0",
      capabilities: capabilities,
      skills: [betExecutionSkill, payoutSkill],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain", "application/json"],
      protocolVersion: "0.3.0",
    };

    // Initialize agent executor
    const agentExecutor = new BettorAgentExecutor();
    const requestHandler = new DefaultRequestHandler(
      bettorAgentCard,
      new InMemoryTaskStore(),
      agentExecutor
    );

    // Setup Express app with A2A routes
    const appBuilder = new A2AExpressApp(requestHandler);
    const app = express();
    const expressApp = appBuilder.setupRoutes(app);

    // Health check endpoint
    expressApp.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        agent: "bettor_agent",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    });

    // Start server
    expressApp.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎲 BETTOR AGENT SERVER STARTED                          ║
║                                                            ║
║   URL:        ${BASE_URL.padEnd(44)} ║
║   Agent Card: ${(BASE_URL + "/.well-known/agent-card.json").padEnd(44)} ║
║   Network:    Hedera Testnet                               ║
║   Protocol:   x402                                         ║
║                                                            ║
║   Capabilities:                                            ║
║   • Bet Placement via x402                                 ║
║   • Smart Contract Integration                             ║
║   • Market Resolution Monitoring                           ║
║   • Automated Payout Distribution                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Error starting Bettor Agent server:", error);
    process.exit(1);
  }
}

await main();

