import { tool } from "langchain";
import { z } from "zod";
import {
  Client,
  Hbar,
  TransferTransaction,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

// Initialize Hedera client
function getHederaClient(): Client {
  const network = process.env.HEDERA_NETWORK || "testnet";
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("Hedera operator credentials not configured");
  }

  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey)
  );

  return client;
}

// Tool 1: Create x402 Payment Request (Simplified - Direct Hedera Transfer)
export const triggerX402Payment = tool(
  async ({ userAccountId, amount, marketId, direction, metadata }) => {
    try {
      // In a full x402 implementation, this would create a payment request
      // For now, we'll simulate by preparing the transaction details

      const paymentRequestId = `pay_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      // Return payment request info
      // In production, this would be an x402 payment URL that opens in wallet
      return JSON.stringify({
        success: true,
        paymentRequestId,
        status: "pending",
        message: "Payment request created. Please transfer funds and confirm.",
        details: {
          from: userAccountId,
          to: process.env.BETTING_CONTRACT_ID || "contract",
          amount: `${amount} HBAR`,
          marketId,
          direction,
        },
        // In production x402, this would be the payment approval URL
        paymentUrl: `hedera://transfer?to=${process.env.BETTING_CONTRACT_ID}&amount=${amount}&memo=${marketId}_${direction}`,
        expiresIn: 300, // 5 minutes
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Payment request failed",
      });
    }
  },
  {
    name: "trigger_x402_payment",
    description:
      "Creates an x402 payment request for placing a bet. Returns payment details and URL for user to approve in their wallet.",
    schema: z.object({
      userAccountId: z
        .string()
        .describe("Hedera account ID of the user (e.g., 0.0.12345)"),
      amount: z.string().describe("Amount to bet in HBAR (e.g., '100')"),
      marketId: z
        .string()
        .describe("Unique identifier of the prediction market"),
      direction: z.enum(["yes", "no"]).describe("Bet direction: 'yes' or 'no'"),
      metadata: z.object({}).optional().describe("Additional metadata"),
    }),
  }
);

// Tool 2: Record Bet (Flexible - Ready for your custom implementation)
export const recordBet = tool(
  async ({ userAccountId, marketId, amount, direction, transactionId }) => {
    try {
      // TODO: Integrate with your custom betting backend/smart contract
      // This is a placeholder that returns success for development

      const betId = `bet_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;

      console.log("[RECORD BET]", {
        betId,
        userAccountId,
        marketId,
        amount,
        direction,
        transactionId,
        timestamp: new Date().toISOString(),
      });

      // Return success - ready for your implementation
      return JSON.stringify({
        success: true,
        betId,
        status: "RECORDED",
        betRecorded: true,
        message: `Bet recorded: ${amount} HBAR on ${direction.toUpperCase()} for market ${marketId}`,
        details: {
          betId,
          userAccountId,
          marketId,
          amount: `${amount} HBAR`,
          direction,
          transactionId,
          timestamp: new Date().toISOString(),
        },
        note: "Ready for custom implementation - integrate with your betting backend here",
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to record bet",
      });
    }
  },
  {
    name: "record_bet",
    description:
      "Records a bet after payment is confirmed. Ready for integration with your custom betting backend.",
    schema: z.object({
      userAccountId: z.string().describe("Hedera account ID"),
      marketId: z.string().describe("Market identifier"),
      amount: z.string().describe("Bet amount in HBAR"),
      direction: z.enum(["yes", "no"]).describe("Bet direction"),
      transactionId: z.string().optional().describe("Payment transaction ID"),
    }),
  }
);

// Tool 3: Check Market Resolution
export const checkMarketResolution = tool(
  async ({ marketId }) => {
    try {
      // Query Polymarket API for market status
      const apiUrl =
        process.env.POLYMARKET_API_URL || "https://gamma-api.polymarket.com";
      const response = await fetch(`${apiUrl}/markets/${marketId}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const marketData = await response.json();

      return JSON.stringify({
        success: true,
        marketId,
        resolved: marketData.closed || false,
        outcome: marketData.outcome || null, // 'yes' or 'no'
        resolvedAt: marketData.end_date || null,
        title: marketData.title || "Unknown Market",
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to check resolution",
        marketId,
      });
    }
  },
  {
    name: "check_market_resolution",
    description:
      "Checks if a prediction market has been resolved and returns the outcome. Queries Polymarket API.",
    schema: z.object({
      marketId: z.string().describe("Market identifier to check"),
    }),
  }
);

// Tool 4: Get Winning Bets (Flexible - Ready for your custom implementation)
export const getWinningBets = tool(
  async ({ marketId, outcome }) => {
    try {
      // TODO: Integrate with your custom betting backend to fetch winners
      // Query your database or smart contract for winning bets

      console.log("[GET WINNING BETS]", {
        marketId,
        outcome,
        timestamp: new Date().toISOString(),
      });

      // Placeholder response - replace with actual query
      return JSON.stringify({
        success: true,
        marketId,
        outcome,
        winners: [], // TODO: Return array of { userAccountId, amount, payout }
        message:
          "Ready for custom implementation - query your betting backend here",
        note: "Integrate with your database or smart contract to fetch actual winners",
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get winners",
        marketId,
        outcome,
      });
    }
  },
  {
    name: "get_winning_bets",
    description:
      "Gets all winning bets for a resolved market. Ready for integration with your custom betting backend.",
    schema: z.object({
      marketId: z.string().describe("Resolved market identifier"),
      outcome: z.enum(["yes", "no"]).describe("Winning outcome"),
    }),
  }
);

// Tool 5: Trigger Payout via x402
export const triggerPayout = tool(
  async ({ userAccountId, amount, marketId, originalBet }) => {
    try {
      const client = getHederaClient();

      // In production x402, this would create a payout request
      // For now, we'll execute a direct Hedera transfer

      const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID!);
      const recipientId = AccountId.fromString(userAccountId);
      const amountHbar = Hbar.from(parseFloat(amount), "hbar");

      // Execute transfer
      const transaction = new TransferTransaction()
        .addHbarTransfer(operatorId, amountHbar.negated())
        .addHbarTransfer(recipientId, amountHbar)
        .setTransactionMemo(`Payout: ${marketId}`);

      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);

      return JSON.stringify({
        success: true,
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString(),
        userAccountId,
        amount: `${amount} HBAR`,
        marketId,
        message: `Payout of ${amount} HBAR sent to ${userAccountId}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Payout failed",
        userAccountId,
        amount,
      });
    }
  },
  {
    name: "trigger_payout",
    description:
      "Triggers an x402 payout to send winnings to a user. Executes blockchain transfer from contract to user wallet.",
    schema: z.object({
      userAccountId: z.string().describe("Hedera account ID of winner"),
      amount: z.string().describe("Payout amount in HBAR"),
      marketId: z.string().describe("Market identifier"),
      originalBet: z.string().optional().describe("Original bet amount"),
    }),
  }
);

export const bettorTools = [
  triggerX402Payment,
  recordBet,
  checkMarketResolution,
  getWinningBets,
  triggerPayout,
];
