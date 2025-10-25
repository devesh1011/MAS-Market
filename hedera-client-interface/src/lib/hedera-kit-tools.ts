import { Client, PrivateKey } from '@hashgraph/sdk';
import { AgentMode, HederaLangchainToolkit } from 'hedera-agent-kit';
import { tool } from 'langchain';
import * as z from 'zod';

// Configure Hedera client with environment variables
const agentClient = Client.forTestnet();
if (process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY) {
  agentClient.setOperator(
    process.env.HEDERA_ACCOUNT_ID,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY),
  );
}

function makeCallable(original: unknown) {
  return async (input: string): Promise<string> => {
    if (!original) throw new Error('Original tool missing');

    // Common method names used by different tool implementations
    const candidates = ['run', 'call', 'invoke', 'execute', 'handle'];

    for (const m of candidates) {
      // @ts-expect-error - dynamic access to unknown object
      if (typeof original[m] === 'function') {
        try {
          // Try calling with a single string arg first
          // @ts-expect-error - dynamic invocation
          return await original[m](input);
        } catch {
          // If failed, try calling with an object shape
          try {
            // @ts-expect-error - dynamic invocation
            return await original[m]({ task: input });
          } catch {
            // continue to next candidate
          }
        }
      }
    }

    // Fallback: if the original is itself a function
    if (typeof original === 'function') {
      return await original(input);
    }

    throw new Error('No callable method found on original tool');
  };
}

/**
 * Wraps Hedera Agent Kit tools using LangChain's tool() function
 * Following LangChain v1 conventions with proper Zod schemas
 */
async function hederaTools(userAccountId: string) {
  const hederaAgentToolkit = new HederaLangchainToolkit({
    client: agentClient,
    configuration: {
      tools: [],
      context: {
        mode: AgentMode.RETURN_BYTES,
        accountId: userAccountId,
      },
    },
  });

  const originalTools: unknown[] = hederaAgentToolkit.getTools();

  // Wrap each Hedera toolkit tool using LangChain's tool() function
  const wrappedTools = originalTools.map((t) => {
    const tObj = t as Record<string, unknown>;

    // Extract tool metadata
    const name = (tObj.name || tObj.id || tObj.toolName || 'hedera_tool') as string;
    const description = (tObj.description || tObj.desc || 'Hedera Kit Tool') as string;
    const callable = makeCallable(t);

    // Create LangChain tool using tool() function with Zod schema
    // For balance queries, we need to pass the account ID as a parameter
    if (name.includes('balance') || name.includes('hbar')) {
      return tool(
        async () => {
          // For balance tools, pass the account ID from context
          const balanceInput = { accountId: userAccountId };
          const rawResponse = await callable(JSON.stringify(balanceInput));

          // Parse and convert tinybar to HBAR for balance responses
          try {
            const parsed = JSON.parse(rawResponse);
            if (parsed.hbarBalance && typeof parsed.hbarBalance === 'string') {
              const tinybarBalance = parseInt(parsed.hbarBalance);
              const hbarBalance = tinybarBalance / 100000000; // 1 HBAR = 100,000,000 tinybar
              parsed.hbarBalance = hbarBalance.toString();
              parsed.balanceUnit = 'HBAR';
              return JSON.stringify(parsed);
            }
          } catch {
            // If parsing fails, return original response
          }

          return rawResponse;
        },
        {
          name,
          description,
          schema: z.object({
            input: z
              .string()
              .optional()
              .describe('Optional input parameter (account ID will be used from context)'),
          }),
        },
      );
    } else {
      // For other tools, use the standard approach
      return tool(
        async (input) => {
          // Delegate to the original Hedera toolkit tool
          return await callable(input.input || JSON.stringify({}));
        },
        {
          name,
          description,
          schema: z.object({
            input: z.string().describe('Input parameter for the Hedera tool'),
          }),
        },
      );
    }
  });

  return wrappedTools;
}
export { hederaTools };
