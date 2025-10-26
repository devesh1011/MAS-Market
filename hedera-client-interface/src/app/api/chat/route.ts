import { handleChatBodySchema } from '@/server/schema';
import { NextRequest } from 'next/server';
import { getInitializedHostAgentSync } from '@/server/initialize-agent';

export const runtime = 'nodejs';

type ResponseData = {
  message: string;
  error?: string;
};

/**
 * POST /api/chat
 * Main chat endpoint for prediction market queries
 *
 * Request body:
 * {
 *   input: string (user query)
 *   history: Array<{ role: string, content: string }> (chat history)
 *   userAccountId: string (Hedera account ID)
 * }
 *
 * Response:
 * {
 *   message: string (agent response)
 *   transactionBytes?: string (base64 encoded transaction for signing)
 *   transactionId?: string (transaction ID if already executed)
 *   marketData?: any (market information)
 *   analysis?: any (event analysis and recommendation)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validate request body
    const parsedBody = handleChatBodySchema.safeParse(data);
    if (!parsedBody.success) {
      return Response.json(
        {
          message: 'Invalid request body',
          error: 'Missing required fields: input, history, userAccountId',
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;

    // Initialize host agent with remote agent URLs
    const remoteAgentAddresses = [
      process.env.POLYMARKET_AGENT_URL || 'http://localhost:8001',
      process.env.RESEARCH_AGENT_URL || 'http://localhost:8002',
      process.env.BETTOR_AGENT_URL || 'http://localhost:8003',
    ];

    console.log('[CHAT API] Initializing agent with remotes:', remoteAgentAddresses);

    const hostAgent = await getInitializedHostAgentSync(remoteAgentAddresses, body.userAccountId);

    const agentResponse = await hostAgent.invoke(body.input, data.threadId);

    console.log('[CHAT API] Agent response received:', {
      type: typeof agentResponse,
      keys: Object.keys(agentResponse || {}),
    });

    // Handle response format - now always returns { output: string }
    const outputMessage = agentResponse?.output || 'No response generated';

    const response: ResponseData = {
      message: outputMessage,
    };

    console.log('[CHAT API] Response prepared successfully');
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error('[CHAT API] Error:', error);

    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      const err = error as Record<string, unknown>;
      errorMessage = String(err.message);
    } else {
      errorMessage = String(error);
    }

    return Response.json(
      {
        message: 'Error processing your request. Please try again.',
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat
 * Returns available agents and capabilities
 */
export async function GET() {
  return Response.json({
    message: 'Prediction Market Chat API',
    capabilities: [
      'Market data discovery via Polymarket Agent',
      'Event analysis via Research Agent',
      'Bet execution via Bettor Agent with x402 payments',
      'Automated payout distribution',
      'Multi-turn conversation context',
    ],
    endpoints: {
      chat: 'POST /api/chat',
      status: 'GET /api/chat',
    },
  });
}
