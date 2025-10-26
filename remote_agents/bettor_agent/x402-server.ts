import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, type HederaAddress } from "x402-express";
import {
  Client,
  ScheduleCreateTransaction,
  TransferTransaction,
  AccountId,
  PrivateKey,
  Hbar,
  ScheduleSignTransaction,
  ScheduleInfoQuery,
} from "@hashgraph/sdk";
import axios from "axios";

config();

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const BETTOR_AGENT_ID = process.env.HEDERA_OPERATOR_ID! as HederaAddress;
const BETTOR_AGENT_KEY = process.env.HEDERA_OPERATOR_KEY!;
const ORACLE_ACCOUNT_ID = process.env.ORACLE_ACCOUNT_ID!;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:8402";
const MIRROR_NODE_URL = process.env.MIRROR_NODE_URL || "https://testnet.mirrornode.hedera.com";

const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
client.setOperator(AccountId.fromString(BETTOR_AGENT_ID), PrivateKey.fromString(BETTOR_AGENT_KEY));

interface Bet {
  betId: string;
  userId: string;
  amount: number;
  marketId: string;
  direction: "yes" | "no";
  outcome: "pending" | "win" | "lose";
  scheduleId: string | null;
  betPlaced: boolean; // Payment received via x402
  createdAt: string;
  resolvedAt: string | null;
  payoutExecuted: boolean;
}

const bets = new Map<string, Bet>();

function generateBetId(): string {
  return `bet_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

async function getScheduleStatus(scheduleId: string): Promise<{
  executed: boolean;
  executedTimestamp: string | null;
  deleted: boolean;
}> {
  try {
    const response = await axios.get(`${MIRROR_NODE_URL}/api/v1/schedules/${scheduleId}`);
    return {
      executed: response.data.executed_timestamp !== null,
      executedTimestamp: response.data.executed_timestamp,
      deleted: response.data.deleted !== null,
    };
  } catch (error) {
    console.error("Mirror node query error:", error);
    throw new Error("Failed to query schedule status");
  }
}

const app = express();
app.use(express.json());

// Apply x402 payment middleware to betting endpoints
app.use(
  paymentMiddleware(
    BETTOR_AGENT_ID,
    {
      // Bet placement endpoint - requires payment in HBAR
      "POST /bet": {
        price: {
          amount: "50000000", // 0.5 HBAR (50000000 tinybars)
          asset: {
            address: "hbar",
            decimals: 8,
          },
        },
        network: "hedera-testnet",
      },
      // Payout request - free (but validates via schedule status)
      "GET /payout/*": {
        price: {
          amount: "0",
          asset: {
            address: "hbar",
            decimals: 8,
          },
        },
        network: "hedera-testnet",
      },
    },
    {
      url: FACILITATOR_URL,
    }
  )
);

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "x402-betting-server",
    network: HEDERA_NETWORK,
    bettorAgent: BETTOR_AGENT_ID,
    oracle: ORACLE_ACCOUNT_ID,
    activeBets: bets.size,
    facilitator: FACILITATOR_URL,
  });
});

// POST /bet - Place bet (protected by x402 payment)
app.post("/bet", async (req, res) => {
  try {
    const { userId, amount, marketId, direction } = req.body;

    if (!userId || !amount || !marketId || !["yes", "no"].includes(direction)) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    const betId = generateBetId();
    const betAmount = parseFloat(amount);
    const payoutAmount = betAmount * 2;

    console.log(`\n📊 Creating bet ${betId}`);
    console.log(`   User: ${userId}`);
    console.log(`   Amount: ${betAmount} HBAR`);
    console.log(`   Market: ${marketId}`);
    console.log(`   Direction: ${direction}`);

    // Create scheduled payout transaction
    const payoutTx = new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(BETTOR_AGENT_ID), Hbar.from(-payoutAmount, "hbar"))
      .addHbarTransfer(AccountId.fromString(userId), Hbar.from(payoutAmount, "hbar"))
      .setTransactionMemo(`Payout for bet ${betId}`);

    const scheduleTx = await new ScheduleCreateTransaction()
      .setScheduledTransaction(payoutTx)
      .setScheduleMemo(`Bet payout: ${betId}`)
      .setAdminKey(PrivateKey.fromString(BETTOR_AGENT_KEY))
      .execute(client);

    const scheduleReceipt = await scheduleTx.getReceipt(client);
    const scheduleId = scheduleReceipt.scheduleId!.toString();

    console.log(`✅ Scheduled payout created: ${scheduleId}`);

    // Store bet - payment already verified by x402 middleware
    const bet: Bet = {
      betId,
      userId,
      amount: betAmount,
      marketId,
      direction,
      outcome: "pending",
      scheduleId,
      betPlaced: true, // x402 verified payment
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      payoutExecuted: false,
    };

    bets.set(betId, bet);

    return res.status(201).json({
      success: true,
      betId,
      scheduleId,
      message: "Bet placed successfully via x402 payment",
      bet: {
        betId,
        userId,
        amount: `${betAmount} HBAR`,
        marketId,
        direction,
        scheduleId,
        status: "active",
      },
    });
  } catch (error: any) {
    console.error("Error placing bet:", error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /resolve/:betId - Oracle resolves bet (REMOVED - Oracle service handles this automatically)
// This endpoint is now internal only or removed entirely
// The oracle-service.ts monitors markets and signs schedules automatically

// GET /payout/:betId - Request payout (X402 flow)
app.get("/payout/:betId", async (req, res) => {
  try {
    const { betId } = req.params;

    const bet = bets.get(betId);
    if (!bet) return res.status(404).json({ error: "Bet not found" });
    if (bet.outcome === "pending") {
      return res.status(400).json({ error: "Bet not yet resolved" });
    }
    if (bet.outcome === "lose") {
      return res.status(403).json({ error: "No payout - user lost" });
    }
    if (bet.payoutExecuted) {
      return res.json({ success: true, message: "Payout already processed" });
    }

    console.log(`\n💰 Checking payout for bet ${betId}`);

    const scheduleStatus = await getScheduleStatus(bet.scheduleId!);

    if (!scheduleStatus.executed) {
      console.log(`⏳ Schedule not executed yet`);
      
      return res.status(402).json({
        error: "Payment Required",
        message: "Scheduled payout not yet executed. Waiting for confirmation.",
        betId,
        scheduleId: bet.scheduleId,
        status: "awaiting_execution",
        retryAfter: 5,
      });
    }

    bet.payoutExecuted = true;
    bets.set(betId, bet);

    console.log(`✅ Payout executed for bet ${betId}`);

    return res.json({
      success: true,
      betId,
      message: "Payout successful!",
      amount: `${bet.amount * 2} HBAR`,
      scheduleId: bet.scheduleId,
      executedAt: scheduleStatus.executedTimestamp,
    });
  } catch (error: any) {
    console.error("Error processing payout:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/bet/:betId", (req, res) => {
  const bet = bets.get(req.params.betId);
  if (!bet) return res.status(404).json({ error: "Bet not found" });
  return res.json({ success: true, bet });
});

app.get("/bets", (req, res) => {
  return res.json({ success: true, bets: Array.from(bets.values()) });
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║   🎲 X402 BETTING SERVER - REAL IMPLEMENTATION              ║
║   URL: http://localhost:${PORT}                                 ║
║   Network: ${HEDERA_NETWORK}                                         ║
║   Bettor Agent: ${BETTOR_AGENT_ID}                           ║
║   Oracle: ${ORACLE_ACCOUNT_ID}                                ║
║   Facilitator: ${FACILITATOR_URL}                            ║
║   ✓ Real x402 payment middleware                            ║
║   ✓ Real Hedera scheduled transactions                      ║
║   ✓ Real mirror node verification                           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export { app, bets };
