import { NextRequest } from 'next/server';
import { Client, TransferTransaction, PrivateKey, AccountId, Hbar, HbarUnit } from '@hashgraph/sdk';
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
 * POST /api/payout
 * Sends payout to a winning bet
 * Body: { betId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { betId } = await req.json();

    if (!betId) {
      return Response.json(
        { error: 'Missing betId' },
        { status: 400 }
      );
    }

    // Get bet details
    const bets = await readBets();
    const bet = bets.find(b => b.id === betId);

    if (!bet) {
      return Response.json(
        { error: 'Bet not found' },
        { status: 404 }
      );
    }

    if (bet.status === 'paid') {
      return Response.json(
        { error: 'Bet already paid', payoutTxId: bet.payoutTxId },
        { status: 400 }
      );
    }

    if (bet.status !== 'won') {
      return Response.json(
        { error: `Bet status is ${bet.status}, not won` },
        { status: 400 }
      );
    }

    // Get bettor agent credentials
    const bettorAgentId = process.env.NEXT_PUBLIC_BETTOR_AGENT_ID;
    const bettorAgentKey = process.env.BETTOR_AGENT_PRIVATE_KEY;

    if (!bettorAgentId || !bettorAgentKey) {
      return Response.json(
        { error: 'Bettor agent credentials not configured' },
        { status: 500 }
      );
    }

    // Create Hedera client with bettor agent credentials
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(bettorAgentId),
      PrivateKey.fromStringECDSA(bettorAgentKey)
    );

    // Calculate payout (2x original bet = bet + winnings)
    const payoutAmount = bet.amount * 2;

    console.log(`💰 Sending payout: ${payoutAmount} HBAR to ${bet.userId}`);

    // Send payout from bettor agent to winner
    const transaction = await new TransferTransaction()
      .addHbarTransfer(
        AccountId.fromString(bettorAgentId),
        Hbar.from(-payoutAmount, HbarUnit.Hbar)
      )
      .addHbarTransfer(
        AccountId.fromString(bet.userId),
        Hbar.from(payoutAmount, HbarUnit.Hbar)
      )
      .setTransactionMemo(`Payout: ${bet.id}`)
      .execute(client);

    const receipt = await transaction.getReceipt(client);
    const transactionId = transaction.transactionId.toString();

    console.log(`✅ Payout sent: ${transactionId}`);

    // Update bet status
    bet.status = 'paid';
    bet.paidAt = Date.now();
    bet.payoutTxId = transactionId;
    await writeBets(bets);

    return Response.json({
      success: true,
      betId: bet.id,
      payoutAmount,
      transactionId,
      userId: bet.userId,
      message: `Payout of ${payoutAmount} HBAR sent successfully`,
    });
  } catch (error) {
    console.error('Error sending payout:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to send payout' },
      { status: 500 }
    );
  }
}

