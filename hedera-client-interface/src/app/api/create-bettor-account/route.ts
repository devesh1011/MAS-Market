import { NextRequest } from 'next/server';
import { Client, PrivateKey, AccountCreateTransaction, Hbar } from '@hashgraph/sdk';

/**
 * POST /api/create-bettor-account
 * Creates a new Hedera account for the bettor agent
 * ONLY RUN THIS ONCE!
 */
export async function POST(req: NextRequest) {
  try {
    // Use operator account to create new account
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_PRIVATE_KEY;

    if (!operatorId || !operatorKey) {
      return Response.json(
        { error: 'Operator credentials not configured' },
        { status: 500 }
      );
    }

    const client = Client.forTestnet();
    client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

    // Generate new key pair for bettor account
    const newAccountPrivateKey = PrivateKey.generateECDSA();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    // Create new account with 10 HBAR initial balance
    const transaction = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.fromTinybars(1000000000)) // 10 HBAR
      .execute(client);

    const receipt = await transaction.getReceipt(client);
    const newAccountId = receipt.accountId;

    console.log('✅ Bettor account created:', newAccountId?.toString());

    return Response.json({
      success: true,
      accountId: newAccountId?.toString(),
      privateKey: newAccountPrivateKey.toString(),
      publicKey: newAccountPublicKey.toString(),
      message: 'SAVE THESE CREDENTIALS! Add them to your .env file',
    });
  } catch (error) {
    console.error('Error creating account:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create account' },
      { status: 500 }
    );
  }
}

