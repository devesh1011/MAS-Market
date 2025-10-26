import { AgentCard, MessageSendParams } from '@a2a-js/sdk';
import { A2AClient } from '@a2a-js/sdk/client';
import { MemorySaver } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { hederaTools } from '@/lib/hedera-kit-tools';
import { configDotenv } from 'dotenv';
import { createAgent } from 'langchain';

configDotenv();

class RemoteAgentConnection {
  card: AgentCard;
  address: string;
  client: A2AClient;

  constructor(card: AgentCard, address: string, client: A2AClient) {
    this.card = card;
    this.address = address;
    this.client = client;
  }
}

class HostAgent {
  private remoteAgentConnections: Map<string, RemoteAgentConnection> = new Map();
  private cards: Map<string, AgentCard> = new Map();
  private agentsInfo: string = '';
  private agent: any; // LangGraph agent
  private userId: string = 'host_agent';
  private memorySaver: MemorySaver;

  constructor() {
    this.memorySaver = new MemorySaver();
  }

  async initComponents(remoteAgentAddresses: string[]): Promise<void> {
    for (const address of remoteAgentAddresses) {
      try {
        const cardUrl = `${address}/.well-known/agent-card.json`;
        const cardResponse = await fetch(cardUrl);
        if (!cardResponse.ok) {
          throw new Error(`HTTP ${cardResponse.status}: Failed to fetch card`);
        }
        const card: AgentCard = await cardResponse.json();

        const client = await A2AClient.fromCardUrl(cardUrl);
        const connection = new RemoteAgentConnection(card, address, client);
        this.remoteAgentConnections.set(card.name, connection);
        this.cards.set(card.name, card);
      } catch (error) {
        console.error(
          `ERROR: Failed to initialize connection for ${address}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const agentInfoArray = Array.from(this.cards.values()).map((card) =>
      JSON.stringify({ name: card.name, description: card.description }),
    );
    this.agentsInfo = agentInfoArray.length > 0 ? agentInfoArray.join('\n') : 'No friends found';
    console.log('agent_info:', agentInfoArray);
  }

  static async create(remoteAgentAddresses: string[]): Promise<HostAgent> {
    const instance = new HostAgent();
    await instance.initComponents(remoteAgentAddresses);
    return instance;
  }

  async createAgent(userAccountId: string) {
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const hTools = await hederaTools(userAccountId);

    const rootInstruction = this.rootInstruction();

    this.agent = createAgent({
      model: model,
      tools: [this.sendMessage, ...hTools],
      checkpointer: this.memorySaver,
      systemPrompt: rootInstruction,
    });

    return this.agent;
  }

  rootInstruction(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `
**Role:** You are the Prediction Market AI Agent, your mission is to help users make informed decisions about prediction market bets. You are a ChatGPT-like interface for prediction markets on Hedera, making betting accessible and intelligent through natural conversation.

**Core Responsibilities:**

1. **Understand User Intent:** Listen carefully to what users want to know about prediction markets:
   - "What are current odds on Bitcoin hitting $100k?"
   - "Should I bet YES on Trump winning?"
   - "Show me all crypto-related markets"

2. **Delegate to Specialized Agents:** Use the \`send_message\` tool to query specialized remote agents:
   - **Polymarket Agent:** Simple API router that fetches active market events from Polymarket. Returns raw JSON data listing all available markets. Use ONLY for discovering what markets exist, NOT for analysis or recommendations.
   - **Research Agent:** For deep event analysis, probability assessments, and betting recommendations
   - **Bettor Agent:** For executing bets via x402 payment protocol and managing payouts. Handles payment requests, smart contract interactions, and automated settlement.
   
3. **Synthesize Information:** Combine data and analysis to provide clear, actionable insights:
   - Compare market prices with research probability assessments
   - Highlight if markets are underpriced/overpriced
   - Explain your confidence levels and reasoning

4. **Guide Bet Decisions:** Help users understand:
   - What the bet means (YES/NO outcomes)
   - Current market probability vs. research assessment
   - Risk/reward ratios
   - Why they should or shouldn't take a position

5. **Execute Trades:** Delegate to Bettor Agent to:
   - Confirm bet details with the user (market, amount, YES/NO direction)
   - Create x402 payment request for user approval
   - Record bet on Hedera smart contract after payment
   - Provide confirmation with transaction details and bet ID

6. **Maintain Context:** Remember previous messages in conversation to:
   - Track which markets user is interested in
   - Build on previous analysis without repetition
   - Provide continuity across multiple queries

**Critical Guidelines:**

- **Be Conversational:** Sound like ChatGPT, not a manual. Use natural language.
- **Show Your Work:** Explain where data comes from (Polymarket prices vs. Research analysis)
- **Highlight Uncertainty:** Always mention confidence levels and caveats
- **Agent Names:** The available remote agents are listed below. Use exact names when sending messages.
- **Structured Responses:** Format betting analysis with:
  - Market Overview (current prices/odds)
  - Event Analysis (probability assessment)
  - Recommendation (YES/NO with confidence %)
  - Risk Assessment (what could go wrong)
  - Next Steps (how to proceed)
- **Payment Flow:** When user confirms they want to bet:
  1. Confirm amount and direction (YES/NO)
  2. Use Hedera Agent Kit to process payment
  3. Execute trade and return transaction ID
  4. Confirm position is live

**Today's Date (YYYY-MM-DD):** ${today}

<Available Remote Agents>
${this.agentsInfo}
</Available Remote Agents>

**Few-Shot Examples:**

**Example 1: Market Discovery Query**
User: "What markets are available on Bitcoin?"
Your Process:
1. Call Polymarket Agent: "Get all active market events"
2. Filter/search the returned market list for Bitcoin-related markets
3. Present markets to user
Response: "I found 3 Bitcoin markets on Polymarket: [list markets with basic info]. Which one interests you?"

**Example 2: Should I Bet Query (Requires Both Agents)**
User: "Should I bet on Bitcoin reaching $150K in October 2025?"
Your Process:
1. Call Polymarket Agent: "Get all active market events" (to check if this market exists)
2. Call Research Agent: "Analyze probability of Bitcoin reaching $150K by October 2025, consider current price trends, historical volatility, and market conditions"
3. Synthesize both responses
Response: "📊 **Market Available:** [if found in Polymarket list, show basic details]...
🔍 **Analysis:** Based on research, the probability is estimated at [Z]% because [reasons]...
💡 **Recommendation:** [YES/NO] with [confidence]% confidence. [reasoning]"

**Example 3: Analysis-Only Query (Research Agent ONLY)**
User: "Has North Korea launched a missile?"
Your Process:
1. Call Research Agent ONLY: "Has North Korea launched a missile? Provide current information."
2. Do NOT call Polymarket Agent - this is pure research, not market discovery
Response: "🔍 Based on recent information: [analysis with evidence]. The market sentiment suggests [bet_on] based on available data."

**Example 4: Analysis-Heavy Query with Optional Market Check**
User: "Will Trump's approval rating go up this week?"
Your Process:
1. Call Research Agent: "Analyze Trump approval rating trends and predict if it will increase this week"
2. OPTIONALLY call Polymarket Agent only if market exists (not required)
Response: "🔍 **Research Analysis:** [probability and reasoning]
 **Recommendation:** [based primarily on research]"

**Example 5: Simple Market Lookup (Polymarket ONLY)**
User: "What's the current price on Trump winning 2024?"
Your Process:
1. Call Polymarket Agent ONLY: "Get all active market events"
2. Search returned list for Trump 2024 markets
3. Present the market info from the list
Response: "📊 I found [market name] in the active markets list. [show basic details]. Would you like me to analyze if this is a good bet?"

**Example 6: Should I Bet Query (Both Agents)**
User: "Should I bet on Bitcoin reaching $150K in October 2025?"
Your Process:
1. Call Polymarket Agent: "Get all active market events" (to check if this market exists)
2. Call Research Agent: "Analyze probability of Bitcoin reaching $150K by October 2025"
3. Synthesize both responses
Response: "📊 **Market Available:** [if found]...
🔍 **Analysis:** [probability assessment]...
💡 **Recommendation:** [YES/NO with confidence]"

**Example 7: Follow-up Analysis**
User: "Yes, analyze if it's a good bet"
Your Process:
1. Call Research Agent: "Analyze probability of Trump winning 2024 election based on polling, fundraising, and historical patterns"
2. Use previously retrieved Polymarket market data
Response: "🔍 Based on my analysis: [detailed reasoning]
💡 My assessment: [YES/NO] - [explain recommendation]"

**Key Patterns - IMPORTANT:**
- **Research/Analysis ONLY** (no Polymarket needed):
  - "Has [event] happened?" → Research Agent only
  - "Will [future event] happen?" → Research Agent only
  - "What's your opinion on...?" → Research Agent only
  - "Analyze..." → Research Agent only
  - ANY question asking for analysis/probability that doesn't reference a specific market → Research Agent ONLY

- **Market Discovery ONLY** (no Research needed):
  - "What markets are available on [topic]?" → Polymarket Agent only
  - "Show me [topic] markets" → Polymarket Agent only
  - "What's trading on Polymarket?" → Polymarket Agent only

- **Both Agents** (when explicitly asking about a bet):
  - "Should I bet on...?" → Both (Polymarket for market data + Research for analysis)
  - "Is this a good bet?" → Both (Polymarket for current odds + Research for analysis)
  - After user says "analyze this market" → Research Agent with market context

**CRITICAL RULE:**
- Do NOT call Polymarket Agent unless the query explicitly asks about MARKETS or PRICES
- Pure analysis questions should go to Research Agent ONLY
- Polymarket Agent is for discovering what markets exist, NOT for news or event analysis
- Research Agent provides ALL analysis, probabilities, and betting recommendations

**Remember:** You're helping users navigate uncertainty and make better decisions. Be helpful, clear, and honest about limitations.
    `;
  }

  sendMessage = tool(
    async ({ agent_name, task }: { agent_name: string; task: string }) => {
      /** Send a message to a remote A2A agent */
      if (!this.remoteAgentConnections.has(agent_name)) {
        throw new Error(`Agent ${agent_name} not found`);
      }

      const connection = this.remoteAgentConnections.get(agent_name)!;
      const client = connection.client;

      const messageId = uuidv4();

      const sendParams: MessageSendParams = {
        message: {
          messageId,
          role: 'user',
          parts: [{ kind: 'text', text: task }],
          kind: 'message',
        },
        configuration: {
          blocking: true, // Wait for full response
          acceptedOutputModes: ['text/plain'],
        },
      };

      // Call sendMessage with MessageSendParams directly
      const sendResponse = await client.sendMessage(sendParams);
      console.log('send_response', sendResponse);

      // Check if response has an error property
      if ('error' in sendResponse) {
        console.log('Received error response:', sendResponse.error);
        return 'Error: Invalid response from remote agent.';
      }

      // Extract result from the response
      const result = (sendResponse as any).result;
      if (!result) {
        return 'Error: No result in response.';
      }

      // Parse response - result can be a Message, Task, or other types
      const resp: string[] = [];

      // If result is a Task with artifacts
      if (result.kind === 'task' && result.artifacts) {
        for (const artifact of result.artifacts) {
          if (artifact.parts) {
            resp.push(...artifact.parts.map((p: any) => p.text || p));
          }
        }
      }
      // If result is a Message
      else if (result.kind === 'message' && result.parts) {
        resp.push(...result.parts.map((p: any) => p.text || p));
      }

      const responseText = resp.length > 0 ? resp.join('\n') : 'No response content available.';

      // Try to parse and extract structured response for Research Agent
      // Research Agent returns JSON with { summary, what_to_bet }
      try {
        // Check if the response contains a JSON with summary and what_to_bet
        const jsonMatch = responseText.match(/\{[\s\S]*"summary"[\s\S]*"what_to_bet"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.summary && parsed.what_to_bet) {
            // Return only the structured research response
            return JSON.stringify({
              summary: parsed.summary,
              what_to_bet: parsed.what_to_bet,
            });
          }
        }
      } catch {
        // If parsing fails, return original response
        console.log('Could not parse structured response, returning raw response');
      }

      return responseText;
    },
    {
      name: 'send_message',
      description:
        'Send a message to a remote prediction market agent (Polymarket or Research) to get market data, prices, analysis, or betting recommendations.',
      schema: z.object({
        agent_name: z
          .string()
          .describe("The name of the remote agent (e.g., 'polymarket_agent' or 'research_agent')"),
        task: z
          .string()
          .describe(
            "The query/request to send to the agent (e.g., 'What are the current odds on Bitcoin hitting $100k?' or 'Analyze the Trump 2024 election market')",
          ),
      }),
    },
  );

  async invoke(query: string, threadId?: string): Promise<{ output: string }> {
    const config: RunnableConfig = {
      configurable: { thread_id: threadId || uuidv4() },
    };
    const response = await this.agent.invoke(
      { messages: [new HumanMessage({ content: query })] },
      config,
    );

    console.log('[HostAgent] Response has messages:', !!response.messages);
    console.log('[HostAgent] Number of messages:', response.messages?.length);

    // Extract the last AI message from the response
    if (response.messages && Array.isArray(response.messages)) {
      // Find the last AIMessage in the conversation (iterate backwards)
      for (let i = response.messages.length - 1; i >= 0; i--) {
        const msg = response.messages[i];

        // Check if it's an AIMessage using multiple methods
        const isAIMessage =
          msg.constructor?.name === 'AIMessage' ||
          msg._getType?.() === 'ai' ||
          (msg.lc && msg.lc === 1 && msg.id && msg.id.includes('AIMessage')) ||
          (msg.id && Array.isArray(msg.id) && msg.id.includes('AIMessage'));

        if (isAIMessage) {
          const content = msg.kwargs?.content || msg.content;

          console.log('[HostAgent] Found AIMessage at index', i);
          console.log('[HostAgent] Content type:', typeof content);

          // Handle string content (most common)
          if (typeof content === 'string') {
            console.log('[HostAgent] Returning string content');
            return { output: content };
          }

          // Handle array content (might contain tool calls and text)
          if (Array.isArray(content)) {
            // Filter out tool calls and extract text content
            const textParts = content
              .filter((part) => typeof part === 'string' || part.type === 'text')
              .map((part) => (typeof part === 'string' ? part : part.text || ''));

            if (textParts.length > 0) {
              console.log('[HostAgent] Returning filtered text from array');
              return { output: textParts.join('\n') };
            }
          }

          // Handle object content
          if (content && typeof content === 'object') {
            console.log('[HostAgent] Content is object');
            // If there's a text property, use that
            if ('text' in content) {
              return { output: String(content.text) };
            }
            // Otherwise stringify
            return { output: JSON.stringify(content) };
          }
        }
      }
    }

    console.log('[HostAgent] No valid AIMessage found, returning fallback');
    // Fallback: return the entire response as string
    return { output: JSON.stringify(response) };
  }

  // Optional: Stream method for streaming responses
  async *stream(query: string, threadId?: string) {
    const config: RunnableConfig = {
      configurable: { thread_id: threadId || uuidv4() },
    };
    for await (const chunk of await this.agent.stream(
      { messages: [{ role: 'user', content: query }] },
      config,
    )) {
      yield chunk;
    }
  }
}

let rootAgent: HostAgent | null = null;

async function getInitializedHostAgentSync(
  remoteAgentAddresses: string[],
  userAccountId: string,
): Promise<HostAgent> {
  if (!rootAgent) {
    rootAgent = await HostAgent.create(remoteAgentAddresses);
    await rootAgent.createAgent(userAccountId);
  }
  return rootAgent;
}

export { getInitializedHostAgentSync };
