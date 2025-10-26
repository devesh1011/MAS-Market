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
 * POST /api/track-bet
 * Records a bet after transaction is confirmed
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, amount, marketId, marketTitle, direction, transactionId } = await req.json();

    if (!userId || !amount || !marketId || !direction || !transactionId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const bets = await readBets();

    const bet: Bet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId,
      amount: parseFloat(amount),
      marketId,
      marketTitle: marketTitle || 'Unknown Market',
      direction,
      transactionId,
      status: 'pending',
      createdAt: Date.now(),
    };

    bets.push(bet);
    await writeBets(bets);

    console.log('✅ Bet tracked:', bet.id);

    return Response.json({ 
      success: true, 
      betId: bet.id,
      message: 'Bet recorded successfully'
    });
  } catch (error) {
    console.error('Error tracking bet:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to track bet' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/track-bet?userId=0.0.123
 * Get all bets for a user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const bets = await readBets();

    if (userId) {
      const userBets = bets.filter(b => b.userId === userId);
      return Response.json({ bets: userBets });
    }

    return Response.json({ bets });
  } catch (error) {
    console.error('Error reading bets:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to read bets' },
      { status: 500 }
    );
  }
}

