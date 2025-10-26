import { NextRequest } from 'next/server';
import { TransferTransaction, Client, AccountId, Hbar, HbarUnit, TransactionId } from '@hashgraph/sdk';

/**
 * POST /api/create-bet-transfer
 * Creates a transfer transaction for betting and returns bytes for wallet signing
 * 
 * IMPORTANT: This transaction is frozen WITHOUT a signature, so the wallet can sign it
 */
export async function POST(req: NextRequest) {
  try {
    const { from, to, amount, memo } = await req.json();

    if (!from || !to || !amount) {
      return Response.json(
        { error: 'Missing required fields: from, to, amount' },
        { status: 400 }
      );
    }

    console.log('[CREATE BET] Creating transfer:', { from, to, amount });

    // Create a basic Hedera client (just for network context, NOT for signing)
    const client = Client.forTestnet();
    
    // Generate a unique transaction ID with the user as the account
    const txId = TransactionId.generate(AccountId.fromString(from));
    
    // Create transfer transaction
    const transaction = new TransferTransaction()
      .setTransactionId(txId) // Set transaction ID with user as payer
      .addHbarTransfer(AccountId.fromString(from), Hbar.from(-parseFloat(amount), HbarUnit.Hbar))
      .addHbarTransfer(AccountId.fromString(to), Hbar.from(parseFloat(amount), HbarUnit.Hbar));

    if (memo) {
      transaction.setTransactionMemo(memo);
    }

    // Freeze WITH the client to set network parameters
    // The transaction will expect the "from" account to sign (the fee payer)
    const frozenTransaction = await transaction.freezeWith(client);

    // Convert to bytes for wallet signing
    const transactionBytes = Buffer.from(frozenTransaction.toBytes()).toString('base64');

    console.log('[CREATE BET] Transaction created successfully');

    return Response.json({ transactionBytes }, { status: 200 });
  } catch (error) {
    console.error('[CREATE BET] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

