import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

type Topic = "general" | "news" | "finance";

/**
 * Internet search tool for market research
 * Uses Tavily Search API to find relevant information about market events
 */
const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general" as Topic,
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: Topic;
    includeRawContent?: boolean;
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });

    const tavilyResponse = await tavilySearch.invoke({ query });
    return tavilyResponse;
  },
  {
    name: "internet_search",
    description:
      "Search the internet for information about market events, current news, and relevant data for prediction market analysis",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query - be specific about what information you need"
        ),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of search results to return (1-20)"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe(
          "Search topic category: 'general' for general info, 'news' for news, 'finance' for financial data"
        ),
      includeRawContent: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include raw page content in results"),
    }),
  }
);

/**
 * CoinGecko Crypto Price Tool
 * Provides real-time and historical crypto price data
 */
const getCryptoPriceData = tool(
  async ({
    cryptoIds,
    vsCurrencies = "usd",
    includeMarketCap = true,
    include24hrVol = true,
    include24hrChange = true,
    includePriceChange7d = true,
  }: {
    cryptoIds: string[];
    vsCurrencies?: string;
    includeMarketCap?: boolean;
    include24hrVol?: boolean;
    include24hrChange?: boolean;
    includePriceChange7d?: boolean;
  }) => {
    try {
      const ids = cryptoIds.join(",");
      const params = new URLSearchParams({
        ids,
        vs_currencies: vsCurrencies,
        market_cap: includeMarketCap ? "true" : "false",
        "24h_vol": include24hrVol ? "true" : "false",
        "24h_change": include24hrChange ? "true" : "false",
        "7d_change": includePriceChange7d ? "true" : "false",
      });

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?${params}`
      );
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch crypto price data",
      });
    }
  },
  {
    name: "get_crypto_price_data",
    description:
      "Get real-time cryptocurrency price data, market cap, volume, and price changes. Supports multiple coins and currencies.",
    schema: z.object({
      cryptoIds: z
        .array(z.string())
        .describe(
          "Array of cryptocurrency IDs (e.g., ['bitcoin', 'ethereum', 'cardano']). See: https://api.coingecko.com/api/v3/coins/list"
        ),
      vsCurrencies: z
        .string()
        .optional()
        .default("usd")
        .describe("Target currency code (e.g., 'usd', 'eur', 'gbp')"),
      includeMarketCap: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include market cap data"),
      include24hrVol: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include 24-hour trading volume"),
      include24hrChange: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include 24-hour price change percentage"),
      includePriceChange7d: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include 7-day price change percentage"),
    }),
  }
);

/**
 * CoinGecko Historical Price Tool
 * Get historical price data for technical analysis and trend identification
 */
const getCryptoHistoricalData = tool(
  async ({
    cryptoId,
    days = 30,
    vsCurrency = "usd",
  }: {
    cryptoId: string;
    days?: number;
    vsCurrency?: string;
  }) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`
      );
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Process and summarize the data
      const prices = data.prices as [number, number][];
      const volumes = data.market_caps as [number, number][];

      const summary = {
        crypto: cryptoId,
        period_days: days,
        currency: vsCurrency,
        data_points: prices.length,
        earliest_date: new Date(prices[0][0]).toISOString().split("T")[0],
        latest_date: new Date(prices[prices.length - 1][0])
          .toISOString()
          .split("T")[0],
        current_price: prices[prices.length - 1][1],
        highest_price: Math.max(...prices.map((p) => p[1])),
        lowest_price: Math.min(...prices.map((p) => p[1])),
        price_change: prices[prices.length - 1][1] - prices[0][1],
        price_change_percent:
          ((prices[prices.length - 1][1] - prices[0][1]) / prices[0][1]) * 100,
        average_price: prices.reduce((sum, p) => sum + p[1], 0) / prices.length,
      };

      return JSON.stringify(summary, null, 2);
    } catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch historical crypto data",
      });
    }
  },
  {
    name: "get_crypto_historical_data",
    description:
      "Get historical cryptocurrency price data for the past N days. Useful for trend analysis, volatility assessment, and price movement patterns.",
    schema: z.object({
      cryptoId: z
        .string()
        .describe(
          "Cryptocurrency ID (e.g., 'bitcoin', 'ethereum'). See: https://api.coingecko.com/api/v3/coins/list"
        ),
      days: z
        .number()
        .optional()
        .default(30)
        .describe("Number of days of historical data (1-365)"),
      vsCurrency: z
        .string()
        .optional()
        .default("usd")
        .describe("Target currency code"),
    }),
  }
);

/**
 * CoinGecko Market Trend Tool
 * Analyze overall crypto market trends and compare multiple coins
 */
const getCryptoMarketTrend = tool(
  async ({
    order = "market_cap_desc",
    perPage = 10,
    vsCurrency = "usd",
  }: {
    order?: string;
    perPage?: number;
    vsCurrency?: string;
  }) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=${order}&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h%2C7d%2C30d`
      );
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Summarize market trends
      const trends = data.map((coin: any) => ({
        rank: coin.market_cap_rank,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        market_cap: coin.market_cap,
        volume_24h: coin.total_volume,
        change_24h: coin.price_change_percentage_24h,
        change_7d: coin.price_change_percentage_7d,
        change_30d: coin.price_change_percentage_30d,
        market_cap_change_24h: coin.market_cap_change_percentage_24h,
      }));

      return JSON.stringify(
        {
          currency: vsCurrency,
          timestamp: new Date().toISOString(),
          top_gainers: trends
            .sort((a: any, b: any) => (b.change_24h || 0) - (a.change_24h || 0))
            .slice(0, 3),
          top_losers: trends
            .sort((a: any, b: any) => (a.change_24h || 0) - (b.change_24h || 0))
            .slice(0, 3),
          all_coins: trends,
        },
        null,
        2
      );
    } catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch market trend data",
      });
    }
  },
  {
    name: "get_crypto_market_trend",
    description:
      "Analyze overall cryptocurrency market trends, including top gainers, losers, and market cap rankings. Useful for understanding market sentiment and comparing cryptocurrencies.",
    schema: z.object({
      order: z
        .enum([
          "market_cap_desc",
          "market_cap_asc",
          "volume_desc",
          "volume_asc",
          "id_desc",
          "id_asc",
        ])
        .optional()
        .default("market_cap_desc")
        .describe("Sort order for cryptocurrencies"),
      perPage: z
        .number()
        .optional()
        .default(10)
        .describe("Number of cryptocurrencies to return (1-50)"),
      vsCurrency: z
        .string()
        .optional()
        .default("usd")
        .describe("Target currency code"),
    }),
  }
);

/**
 * Technical Indicators Calculator
 * Calculates RSI, MACD, Bollinger Bands, and other technical analysis indicators
 */
const calculateTechnicalIndicators = tool(
  async ({
    cryptoId,
    days = 30,
    vsCurrency = "usd",
  }: {
    cryptoId: string;
    days?: number;
    vsCurrency?: string;
  }) => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`
      );
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      const prices = data.prices as [number, number][];

      if (prices.length < 2) {
        throw new Error("Insufficient data for technical analysis");
      }

      // Extract close prices
      const closes = prices.map((p) => p[1]);

      // Helper functions
      const calculateSMA = (values: number[], period: number): number[] => {
        const result = [];
        for (let i = 0; i < values.length; i++) {
          if (i < period - 1) {
            result.push(0);
          } else {
            const sum = values
              .slice(i - period + 1, i + 1)
              .reduce((a, b) => a + b, 0);
            result.push(sum / period);
          }
        }
        return result;
      };

      const calculateEMA = (values: number[], period: number): number[] => {
        const k = 2 / (period + 1);
        const result = [];
        let ema = values[0];
        result.push(ema);

        for (let i = 1; i < values.length; i++) {
          ema = values[i] * k + ema * (1 - k);
          result.push(ema);
        }
        return result;
      };

      const calculateRSI = (
        values: number[],
        period: number = 14
      ): number[] => {
        const result = [];
        const deltas = [];
        for (let i = 1; i < values.length; i++) {
          deltas.push(values[i] - values[i - 1]);
        }

        let gains = 0,
          losses = 0;
        for (let i = 0; i < period - 1; i++) {
          if (deltas[i] > 0) gains += deltas[i];
          else losses -= deltas[i];
        }

        for (let i = 0; i < values.length - period; i++) {
          if (deltas[i + period - 1] > 0) {
            gains = (gains * (period - 1) + deltas[i + period - 1]) / period;
            losses = (losses * (period - 1)) / period;
          } else {
            gains = (gains * (period - 1)) / period;
            losses = (losses * (period - 1) - deltas[i + period - 1]) / period;
          }

          const rs = losses === 0 ? 100 : gains / losses;
          const rsi = 100 - 100 / (1 + rs);
          result.push(rsi);
        }
        return result;
      };

      // Calculate indicators
      const sma12 = calculateSMA(closes, 12);
      const sma26 = calculateSMA(closes, 26);
      const ema12 = calculateEMA(closes, 12);
      const ema26 = calculateEMA(closes, 26);
      const rsi14 = calculateRSI(closes, 14);

      // MACD
      const macdLine = [];
      const signalLine = [];
      for (let i = 0; i < ema12.length; i++) {
        macdLine.push(ema12[i] - ema26[i]);
      }
      const macdSignal = calculateEMA(macdLine, 9);
      for (let i = 0; i < macdLine.length; i++) {
        signalLine.push(macdSignal[i] || 0);
      }

      // Bollinger Bands (20-day SMA, 2 std dev)
      const sma20 = calculateSMA(closes, 20);
      const bbands = [];
      for (let i = 20 - 1; i < closes.length; i++) {
        const slice = closes.slice(i - 20 + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b) / 20;
        const variance =
          slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        bbands.push({
          upper: mean + 2 * stdDev,
          middle: mean,
          lower: mean - 2 * stdDev,
        });
      }

      // Get latest values
      const latestPrice = closes[closes.length - 1];
      const latestRSI = rsi14[rsi14.length - 1];
      const latestMACD = macdLine[macdLine.length - 1];
      const latestSignal = signalLine[signalLine.length - 1];
      const latestBB = bbands[bbands.length - 1];
      const sma50 = calculateSMA(closes, 50);
      const latestSMA50 = sma50[sma50.length - 1];
      const latestSMA200 = calculateSMA(closes, 200)[closes.length - 1] || 0;

      // Generate signals
      const signals = [];
      if (latestRSI < 30) signals.push("OVERSOLD - potential bounce");
      if (latestRSI > 70) signals.push("OVERBOUGHT - potential pullback");
      if (latestPrice > latestBB.upper)
        signals.push("Above upper Bollinger Band - strong momentum");
      if (latestPrice < latestBB.lower)
        signals.push("Below lower Bollinger Band - strong downtrend");
      if (latestMACD > latestSignal)
        signals.push("MACD above signal - bullish momentum");
      if (latestMACD < latestSignal)
        signals.push("MACD below signal - bearish momentum");
      if (latestSMA50 > 0 && latestPrice > latestSMA50)
        signals.push("Trading above 50-day MA - uptrend");
      if (latestSMA50 > 0 && latestPrice < latestSMA50)
        signals.push("Trading below 50-day MA - downtrend");

      return JSON.stringify(
        {
          crypto: cryptoId,
          period_days: days,
          timestamp: new Date().toISOString(),
          current_price: latestPrice,
          indicators: {
            rsi_14: Math.round(latestRSI * 100) / 100,
            rsi_status:
              latestRSI < 30
                ? "oversold"
                : latestRSI > 70
                ? "overbought"
                : "neutral",
            macd: {
              line: Math.round(latestMACD * 100000000) / 100000000,
              signal: Math.round(latestSignal * 100000000) / 100000000,
              histogram:
                Math.round((latestMACD - latestSignal) * 100000000) / 100000000,
            },
            bollinger_bands: {
              upper: Math.round(latestBB.upper * 100) / 100,
              middle: Math.round(latestBB.middle * 100) / 100,
              lower: Math.round(latestBB.lower * 100) / 100,
              position:
                latestPrice > latestBB.upper
                  ? "above_upper"
                  : latestPrice < latestBB.lower
                  ? "below_lower"
                  : "within_bands",
            },
            moving_averages: {
              sma_50:
                latestSMA50 > 0 ? Math.round(latestSMA50 * 100) / 100 : null,
              sma_200:
                latestSMA200 > 0 ? Math.round(latestSMA200 * 100) / 100 : null,
              price_vs_sma50:
                latestSMA50 > 0
                  ? latestPrice > latestSMA50
                    ? "above"
                    : "below"
                  : "insufficient_data",
            },
          },
          technical_signals: signals,
          analysis_summary:
            signals.length > 0
              ? signals.join("; ")
              : "Neutral - no strong technical signals",
        },
        null,
        2
      );
    } catch (error) {
      return JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate technical indicators",
      });
    }
  },
  {
    name: "calculate_technical_indicators",
    description:
      "Calculate technical analysis indicators (RSI, MACD, Bollinger Bands, Moving Averages) for cryptocurrency price prediction. Returns signals for overbought/oversold conditions, trend direction, and momentum.",
    schema: z.object({
      cryptoId: z
        .string()
        .describe(
          "Cryptocurrency ID (e.g., 'bitcoin', 'ethereum'). See: https://api.coingecko.com/api/v3/coins/list"
        ),
      days: z
        .number()
        .optional()
        .default(30)
        .describe(
          "Number of days for indicator calculation (longer = better long-term trend, 14-90 recommended)"
        ),
      vsCurrency: z
        .string()
        .optional()
        .default("usd")
        .describe("Target currency code"),
    }),
  }
);

export {
  internetSearch,
  getCryptoPriceData,
  getCryptoHistoricalData,
  getCryptoMarketTrend,
  calculateTechnicalIndicators,
};
