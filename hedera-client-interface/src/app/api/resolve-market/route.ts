import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Bet {
  id: string;
  userId: string;
  amount: number;
  marketId: string;
  marketTitle: string;
  direction: 'yes' | 'no';
  transactionId: string;
  status: 'pending' | 'won' | 'lost' | 'paid';
  createdAt: number;
  paidAt?: number;
  payoutTxId?: string;
}

const BETS_FILE = path.join(process.cwd(), 'bets.json');

async function readBets(): Promise<Bet[]> {
  try {
    const data = await fs.readFile(BETS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeBets(bets: Bet[]): Promise<void> {
  await fs.writeFile(BETS_FILE, JSON.stringify(bets, null, 2));
}

/**
 * POST /api/resolve-market
 * Resolves a market and marks winners/losers
 * Body: { marketId: string, outcome: 'yes' | 'no', autoPayout?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { marketId, outcome, autoPayout } = await req.json();

    if (!marketId || !outcome) {
      return Response.json(
        { error: 'Missing marketId or outcome' },
        { status: 400 }
      );
    }

    if (outcome !== 'yes' && outcome !== 'no') {
      return Response.json(
        { error: 'Outcome must be "yes" or "no"' },
        { status: 400 }
      );
    }

    const bets = await readBets();

    // Find all pending bets for this market
    const marketBets = bets.filter(b => 
      b.marketId === marketId && 
      b.status === 'pending'
    );

    if (marketBets.length === 0) {
      return Response.json(
        { message: 'No pending bets found for this market', resolved: 0 },
        { status: 200 }
      );
    }

    console.log(`🎯 Resolving market ${marketId} with outcome: ${outcome.toUpperCase()}`);

    const winners: Bet[] = [];
    const losers: Bet[] = [];

    // Mark winners and losers
    for (const bet of marketBets) {
      if (bet.direction === outcome) {
        bet.status = 'won';
        winners.push(bet);
        console.log(`✅ Winner: ${bet.userId} bet ${bet.amount} HBAR on ${bet.direction.toUpperCase()}`);
      } else {
        bet.status = 'lost';
        losers.push(bet);
        console.log(`❌ Loser: ${bet.userId} bet ${bet.amount} HBAR on ${bet.direction.toUpperCase()}`);
      }
    }

    await writeBets(bets);

    // Auto-trigger payouts if requested
    const payoutResults = [];
    if (autoPayout && winners.length > 0) {
      console.log(`💰 Auto-triggering payouts for ${winners.length} winners...`);
      
      for (const winner of winners) {
        try {
          const payoutResponse = await fetch(`${req.nextUrl.origin}/api/payout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ betId: winner.id }),
          });
          
          const payoutData = await payoutResponse.json();
          payoutResults.push({
            betId: winner.id,
            userId: winner.userId,
            success: payoutResponse.ok,
            ...payoutData,
          });
        } catch (error) {
          console.error(`Failed to payout ${winner.id}:`, error);
          payoutResults.push({
            betId: winner.id,
            userId: winner.userId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return Response.json({
      success: true,
      marketId,
      outcome: outcome.toUpperCase(),
      resolved: marketBets.length,
      winners: winners.length,
      losers: losers.length,
      winnerBets: winners.map(w => ({ betId: w.id, userId: w.userId, amount: w.amount })),
      loserBets: losers.map(l => ({ betId: l.id, userId: l.userId, amount: l.amount })),
      payouts: autoPayout ? payoutResults : undefined,
      message: `Market resolved: ${winners.length} winners, ${losers.length} losers`,
    });
  } catch (error) {
    console.error('Error resolving market:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve market' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resolve-market?marketId=xxx
 * Get resolution status for a market
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get('marketId');

    if (!marketId) {
      return Response.json(
        { error: 'Missing marketId parameter' },
        { status: 400 }
      );
    }

    const bets = await readBets();
    const marketBets = bets.filter(b => b.marketId === marketId);

    const pending = marketBets.filter(b => b.status === 'pending');
    const won = marketBets.filter(b => b.status === 'won');
    const lost = marketBets.filter(b => b.status === 'lost');
    const paid = marketBets.filter(b => b.status === 'paid');

    return Response.json({
      marketId,
      total: marketBets.length,
      pending: pending.length,
      won: won.length,
      lost: lost.length,
      paid: paid.length,
      resolved: pending.length === 0 && marketBets.length > 0,
    });
  } catch (error) {
    console.error('Error getting market status:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get market status' },
      { status: 500 }
    );
  }
}

