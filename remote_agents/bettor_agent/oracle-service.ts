/**
 * Oracle Service - REAL Implementation
 * Monitors Polymarket API for market resolutions
 * Automatically signs scheduled transactions for winning bets
 * NO CLIENT CONTROL - Autonomous oracle
 */

import { config } from "dotenv";
import {
  Client,
  AccountId,
  PrivateKey,
  ScheduleSignTransaction,
  ScheduleInfoQuery,
} from "@hashgraph/sdk";
import axios from "axios";

config();

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || "testnet";
const ORACLE_ACCOUNT_ID = process.env.ORACLE_ACCOUNT_ID!;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;
const BETTOR_SERVER_URL = process.env.BETTOR_SERVER_URL || "http://localhost:8003";
const POLYMARKET_API_URL = process.env.POLYMARKET_API_URL || "https://gamma-api.polymarket.com";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "30000"); // 30 seconds

const client = HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
client.setOperator(AccountId.fromString(ORACLE_ACCOUNT_ID), PrivateKey.fromString(ORACLE_PRIVATE_KEY));

interface Bet {
  betId: string;
  userId: string;
  amount: number;
  marketId: string;
  direction: "yes" | "no";
  outcome: string;
  scheduleId: string;
  resolvedAt: string | null;
}

// Track processed bets to avoid double-processing
const processedBets = new Set<string>();

async function getAllPendingBets(): Promise<Bet[]> {
  try {
    const response = await axios.get(`${BETTOR_SERVER_URL}/bets`);
    return response.data.bets.filter((bet: Bet) => 
      bet.outcome === "pending" && 
      bet.scheduleId &&
      !processedBets.has(bet.betId)
    );
  } catch (error) {
    console.error("Error fetching bets:", error);
    return [];
  }
}

async function checkMarketResolution(marketId: string): Promise<{
  resolved: boolean;
  outcome: "yes" | "no" | null;
}> {
  try {
    // Query Polymarket API for market status
    const response = await axios.get(`${POLYMARKET_API_URL}/markets?slug=${marketId}`);
    
    if (response.data && response.data.length > 0) {
      const market = response.data[0];
      
      // Check if market is closed/resolved
      if (market.closed || market.end_date_iso < new Date().toISOString()) {
        // Determine outcome from market data
        // Polymarket uses price close to 1.00 for YES, close to 0.00 for NO
        const lastPrice = market.clob_token_ids?.[0]?.price || 0;
        const outcome = lastPrice > 0.5 ? "yes" : "no";
        
        return {
          resolved: true,
          outcome,
        };
      }
    }
    
    return { resolved: false, outcome: null };
  } catch (error) {
    console.error(`Error checking market ${marketId}:`, error);
    return { resolved: false, outcome: null };
  }
}

async function signScheduleForWinner(bet: Bet): Promise<boolean> {
  try {
    console.log(`\n🔐 Signing schedule for winning bet ${bet.betId}`);
    console.log(`   User: ${bet.userId}`);
    console.log(`   Market: ${bet.marketId}`);
    console.log(`   Payout: ${bet.amount * 2} HBAR`);
    
    const oracleKey = PrivateKey.fromString(ORACLE_PRIVATE_KEY);
    
    // Sign the scheduled transaction
    const signTx = await new ScheduleSignTransaction()
      .setScheduleId(bet.scheduleId)
      .freezeWith(client)
      .sign(oracleKey);

    const signResponse = await signTx.execute(client);
    const receipt = await signResponse.getReceipt(client);

    console.log(`✅ Schedule signed successfully`);
    console.log(`   Schedule ID: ${bet.scheduleId}`);
    console.log(`   Transaction ID: ${signResponse.transactionId.toString()}`);
    console.log(`   Status: ${receipt.status.toString()}`);

    return true;
  } catch (error) {
    console.error(`❌ Error signing schedule for bet ${bet.betId}:`, error);
    return false;
  }
}

async function processBet(bet: Bet): Promise<void> {
  try {
    console.log(`\n🔍 Checking bet ${bet.betId}`);
    console.log(`   Market: ${bet.marketId}`);
    console.log(`   User bet: ${bet.direction.toUpperCase()}`);

    // Check if market is resolved
    const marketStatus = await checkMarketResolution(bet.marketId);

    if (!marketStatus.resolved) {
      console.log(`   ⏳ Market not resolved yet`);
      return;
    }

    console.log(`   ✓ Market resolved: ${marketStatus.outcome?.toUpperCase()}`);

    // Check if user won
    const userWon = bet.direction === marketStatus.outcome;

    if (userWon) {
      console.log(`   🎉 User WON! Signing schedule for payout...`);
      
      const signed = await signScheduleForWinner(bet);
      
      if (signed) {
        processedBets.add(bet.betId);
        console.log(`   ✅ Bet ${bet.betId} processed successfully`);
      }
    } else {
      console.log(`   ❌ User LOST. No payout will be made.`);
      processedBets.add(bet.betId);
    }
  } catch (error) {
    console.error(`Error processing bet ${bet.betId}:`, error);
  }
}

async function monitorAndResolve(): Promise<void> {
  console.log("\n🔄 Checking for pending bets...");
  
  try {
    const pendingBets = await getAllPendingBets();
    
    if (pendingBets.length === 0) {
      console.log("   No pending bets to process");
      return;
    }

    console.log(`   Found ${pendingBets.length} pending bet(s)`);

    // Process each bet
    for (const bet of pendingBets) {
      await processBet(bet);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between bets
    }
  } catch (error) {
    console.error("Error in monitor loop:", error);
  }
}

async function startOracle(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║   ⚖️  ORACLE SERVICE - REAL AUTONOMOUS IMPLEMENTATION       ║
║                                                              ║
║   Oracle Account: ${ORACLE_ACCOUNT_ID.padEnd(43)}║
║   Network:        ${HEDERA_NETWORK.padEnd(43)}║
║   Bettor Server:  ${BETTOR_SERVER_URL.padEnd(43)}║
║   Poll Interval:  ${(POLL_INTERVAL / 1000).toString().padEnd(43)}seconds║
║                                                              ║
║   Monitoring:                                                ║
║   • Polymarket API for market resolutions                   ║
║   • Pending bets from bettor server                         ║
║                                                              ║
║   Actions:                                                   ║
║   • Automatically sign schedules for winners                ║
║   • No manual intervention required                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Run initial check
  await monitorAndResolve();

  // Set up polling interval
  setInterval(async () => {
    await monitorAndResolve();
  }, POLL_INTERVAL);

  console.log("\n✅ Oracle is now monitoring...\n");
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Oracle service shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Oracle service shutting down...');
  process.exit(0);
});

// Start the oracle
startOracle().catch((error) => {
  console.error('❌ Fatal error starting oracle:', error);
  process.exit(1);
});

export { monitorAndResolve, processBet };

