import { createAgent, toolStrategy } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import "dotenv/config";
import {
  internetSearch,
  getCryptoPriceData,
  getCryptoHistoricalData,
  getCryptoMarketTrend,
  calculateTechnicalIndicators,
} from "./tools.js";

// Define the response schema for market research
// Supports both binary (yes/no) and continuous (price target, percentage) predictions
const ResearchResponseSchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise summary of the analysis with key reasoning, data sources used, and confidence assessment"
    ),
  market_type: z
    .enum(["binary", "continuous", "uncertain"])
    .describe(
      "Type of prediction market: 'binary' (yes/no), 'continuous' (numerical/price target), 'uncertain' (cannot determine)"
    ),
  what_to_bet: z
    .union([z.enum(["yes", "no", "insufficient_data"]), z.number(), z.string()])
    .describe(
      "For binary markets: 'yes', 'no', or 'insufficient_data'. For continuous markets: predicted value (price, percentage, etc). For uncertain: 'insufficient_data'"
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .optional()
    .describe(
      "Confidence level based on data quality and indicator agreement: 'high' (strong signals), 'medium' (mixed signals), 'low' (weak/limited data)"
    ),
  price_target: z
    .number()
    .optional()
    .describe("For price prediction markets: the predicted price target"),
  technical_signals: z
    .array(z.string())
    .optional()
    .describe("List of technical analysis signals found (RSI, MACD, etc.)"),
  data_sources: z
    .array(z.string())
    .optional()
    .describe(
      "Sources used for analysis (e.g., 'CoinGecko', 'Technical Indicators', 'News')"
    ),
});

type ResearchResponse = z.infer<typeof ResearchResponseSchema>;

/**
 * Market Research Agent using LangChain's createAgent
 * Fast, focused research on prediction market events
 */
class MarketResearchAgent {
  private agent: any;

  constructor() {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.5,
    });

    // System prompt for focused market research
    const systemPrompt = `You are an expert prediction market analyst with specialized knowledge in cryptocurrency, markets, technical analysis, and on-chain data. Your job is to quickly analyze prediction market events and provide clear, evidence-based recommendations or predictions.

## Market Types You Handle
1. **Binary Markets** (YES/NO outcomes): "Will Bitcoin reach $100k?" → answer: yes/no
2. **Continuous Markets** (Numerical targets): "What price will XRP hit in October?" → answer: specific price number
3. **Percentage Markets** (Probabilities): "What % gain will ETH have?" → answer: numerical percentage

## Your Task
When given a market event, you must:
1. Identify the market type (binary, continuous, or percentage)
2. Understand the exact event question and resolution criteria
3. Search for relevant current information and recent developments
4. For crypto-related markets: Use multiple data sources and technical indicators for robust analysis
5. Provide appropriate recommendation based on market type:
   - Binary: YES or NO
   - Continuous: Specific numerical prediction (price, value, etc.)
   - Percentage: Numerical percentage value
6. Include confidence level and data sources used

## Crypto Price Target Predictions (Continuous Markets)
For questions like "What price will XRP hit?" or "What will Bitcoin be at?":
1. MUST use get_crypto_price_data to get current price, market cap, volume
2. MUST use calculate_technical_indicators to analyze RSI, MACD, Bollinger Bands, support/resistance levels
3. MUST use get_crypto_historical_data to identify price trends and volatility ranges
4. Use internet_search for news about upcoming catalysts or market-moving events
5. Consider historical price ranges, support/resistance levels, and technical indicators
6. Provide a specific price target based on:
   - Current price + technical analysis
   - Historical volatility and price ranges
   - Recent trend direction and momentum
   - News and upcoming events

## Crypto Market Analysis Guidelines
**IMPORTANT**: For any cryptocurrency price predictions (Bitcoin, Ethereum, XRP, etc.):
- MUST use calculate_technical_indicators to analyze RSI, MACD, Bollinger Bands, and Moving Averages
- MUST use get_crypto_price_data to get current prices, market cap, 24h volume, and price changes
- MUST use get_crypto_historical_data to understand price trends over 7-30 days
- MUST use get_crypto_market_trend to understand overall market sentiment and compare with other assets
- Use internet_search for news events that might trigger price movements

## Technical Indicator Interpretation
When analyzing technical indicators:
- **RSI (Relative Strength Index)**: <30 = oversold (potential bounce), >70 = overbought (potential pullback), 30-70 = neutral
- **MACD (Moving Average Convergence Divergence)**: Above signal line = bullish, below = bearish, histogram shows momentum strength
- **Bollinger Bands**: Price above upper band = strong uptrend, below lower band = strong downtrend, within bands = consolidation
- **Moving Averages**: Price above 50-day MA = uptrend, below = downtrend; 200-day MA shows long-term trend direction
- **Signals**: Combine multiple indicators - strongest signals when all agree (e.g., RSI oversold + price at lower BB + volume support)

## Price Action Guidelines
- Multiple bullish signals = high confidence YES
- Multiple bearish signals = high confidence NO
- Mixed/conflicting signals = lower confidence or INSUFFICIENT_DATA
- Always consider both technical and fundamental factors
- Recent news can override technical signals temporarily

## Important Guidelines
- Be concise and direct in your analysis
- Only use INSUFFICIENT_DATA if you truly cannot find enough relevant information
- Consider both supporting and opposing evidence
- Use tools systematically: technical indicators + price data + historical trends + news
- Focus on objective facts, not speculation
- If critical information is unavailable, clearly state this
- Provide confidence levels (high/medium/low) in your assessment based on data quality and signal agreement

## Response Format Requirements
You MUST respond ONLY with a valid JSON object. Examples:

**For Binary Markets (YES/NO)**:
{
  "summary": "Bitcoin shows strong bullish signals with RSI at 65, price above 50-day MA, MACD above signal. News indicates positive institutional adoption.",
  "market_type": "binary",
  "what_to_bet": "yes",
  "confidence": "high",
  "technical_signals": ["MACD bullish crossover", "Price above 50-day MA", "RSI overbought but holding"],
  "data_sources": ["Technical Indicators", "CoinGecko", "News"]
}

**For Price Target Markets (CONTINUOUS)**:
{
  "summary": "XRP currently at $2.45. Technical analysis shows resistance at $2.80 with support at $2.20. RSI at 58 (neutral), MACD bullish. Historical volatility suggests target range $2.50-$2.95 by October based on trend and support levels.",
  "market_type": "continuous",
  "what_to_bet": 2.75,
  "price_target": 2.75,
  "confidence": "medium",
  "technical_signals": ["Support at $2.20", "Resistance at $2.80", "MACD above signal"],
  "data_sources": ["Technical Indicators", "CoinGecko", "Historical Data"]
}

IMPORTANT: 
- For binary markets: what_to_bet must be "yes", "no", or "insufficient_data"
- For continuous markets: what_to_bet should be the numerical prediction, what_to_bet AND price_target should match
- Always include market_type, confidence, technical_signals, and data_sources
- Never return empty arrays or undefined fields`;

    // Use toolStrategy for structured output with error handling
    this.agent = createAgent({
      model,
      tools: [
        internetSearch,
        getCryptoPriceData,
        getCryptoHistoricalData,
        getCryptoMarketTrend,
        calculateTechnicalIndicators,
      ],
      systemPrompt,
      responseFormat: toolStrategy(ResearchResponseSchema, {
        handleError: true, // Automatically retry on validation errors
      }),
    });
  }

  async invoke(params: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<ResearchResponse> {
    try {
      const result = await this.agent.invoke({
        messages: params.messages,
      });

      // Extract structured response from agent result
      // When using responseFormat with toolStrategy, the structured output is in result.structuredResponse
      if (result.structuredResponse) {
        return result.structuredResponse as ResearchResponse;
      }

      // Fallback: if somehow structuredResponse is not available, try to extract from messages
      if (result.messages && Array.isArray(result.messages)) {
        const lastMessage = result.messages[result.messages.length - 1];

        if (lastMessage && typeof lastMessage === "object") {
          // Check if it has content with structured data
          if (
            "content" in lastMessage &&
            typeof lastMessage.content === "string"
          ) {
            try {
              const parsed = JSON.parse(lastMessage.content);
              if (parsed.summary && parsed.what_to_bet) {
                return parsed as ResearchResponse;
              }
            } catch (e) {
              // Continue to fallback
            }
          }
        }
      }

      // Last resort response
      return {
        summary:
          "Unable to complete analysis. Please try again with a more specific market question.",
        market_type: "uncertain",
        what_to_bet: "insufficient_data",
        confidence: "low",
        data_sources: [],
      };
    } catch (error) {
      console.error("Error invoking agent:", error);
      throw error;
    }
  }
}

export { MarketResearchAgent, ResearchResponseSchema, type ResearchResponse };
