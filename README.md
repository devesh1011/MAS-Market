# MAS Market

## 🎯 Overview

MAS Market is a real-time agentic prediction market platform where specialized AI agents work together to analyze events and make intelligent predictions. The platform leverages a multi-agent architecture powered by the A2A (Agent-to-Agent) protocol, with a host orchestrator coordinating three specialized agents: a Research Agent that analyzes markets using advanced technical indicators (RSI, MACD, Bollinger Bands), real-time events data, and news sentiment; a Polymarket Agent that fetches live market datag and a Bettor Agent that handles blockchain transactions and payouts using the x402 payment protocol on Hedera testnet.

Built with LangChain, LangGraph, and Google Gemini 2.5 Flash, the platform features a Next.js frontend with real-time market grids, WebSocket price updates, and an interactive chat interface where users can research any prediction market with a single click. Users receive comprehensive AI-powered analysis with confidence scores, technical signals, and data-driven recommendations for both binary (yes/no) and continuous (price target) prediction markets. The system enables automated betting execution with non-custodial x402 payments, immutable on-chain bet recording, and automatic payout distribution when markets resolves, providing a seamless end-to-end experience for data-driven crypto predictions and automated trading.

---

## ✨ Key Features

### 🤖 **Multi-Agent Intelligence**
Specialized AI agents work together - Research Agent analyzes markets, Polymarket Agent executes trades, and Bettor Agent handles settlements

### 🎯 **AI-Powered Research**
Ask questions about any prediction market and get data-driven recommendations with confidence scores

### 💰 **Automated Betting**
Execute trades automatically based on AI predictions without manual intervention

### 🔗 **Blockchain Settlement**
Secure transaction processing on Hedera testnet with transparent on-chain records

### 📈 **Price Target Predictions**
AI analyzes both binary (yes/no) and continuous (specific price) prediction markets

### 🔍 **Complete Transparency**
See exactly how AI reached its conclusion with technical signals and data sources used

### 💬 **Interactive Chat Interface**
Natural language interface to discuss markets, ask follow-ups, and refine predictions

---

## 🏗️ Architecture

mas market uses a **multi-agent architecture** with A2A (Agent-to-Agent) protocol for distributed intelligence:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  - Real-time market grids with WebSocket pricing            │
│  - Interactive chat interface with markdown rendering        │
│  - One-click AI research for any market                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Host Agent (A2A Client)                         │
│  - LangGraph workflow orchestration                         │
│  - Coordinates all specialized agents                       │
│  - Aggregates responses and returns to frontend             │
└──────┬──────────────┬──────────────────┬────────────────────┘
       │              │                  │
       ▼              ▼                  ▼
┌──────────┐  ┌──────────────┐  ┌──────────────────┐
│Research  │  │  Polymarket  │  │  Bettor Agent    │
│Agent     │  │  Agent       │  │                  │
│Port 8002 │  │  Port 8001   │  │  Port 8003       │
│          │  │              │  │                  │
│Tools:    │  │Tools:        │  │Tools:            │
│- Tavily  │  │- Market Data │  │- x402 Payment    │
│- CoinGecko│ │- CLOB API    │  │- Bet Recording   │
│- Technical│ │- Trading     │  │- Resolution Check│
│  Analysis│  │              │  │- Payout Trigger  │
└──────────┘  └──────────────┘  └──────────────────┘
```

### Communication Flow

1. **User Request** → Host Agent (A2A Client)
2. **Host Agent** determines which specialist agents to invoke
3. **Research Agent** (port 8002) analyzes market with technical indicators
4. **Polymarket Agent** (port 8001) fetches real-time market data
5. **Bettor Agent** (port 8003) executes blockchain transactions
6. **Host Agent** aggregates responses and returns to user

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.3.4** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **react-markdown** - Markdown rendering for AI responses

### **Backend / Agents**
- **LangChain v1** - Agent creation and tool orchestration
- **LangGraph** - State machine workflow management
- **A2A SDK** - Agent-to-Agent communication protocol
- **Google Gemini 2.5 Flash** - Fast LLM inference

### **Data Sources**
- **CoinGecko API** - Crypto price data (14,000+ coins)
- **Tavily Search API** - News and market events
- **Polymarket API** - Prediction market data
- **WebSocket (CLOB)** - Real-time price updates

### **Blockchain**
- **Hedera SDK** - Testnet transactions
- **x402 Protocol** - Non-custodial payment standard
- **HCS** - Consensus service for bet recording

### **Development Tools**
- **Node.js 18+** - JavaScript runtime
- **npm/pnpm** - Package management
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Google API Key** (for Gemini LLM)
- **Tavily API Key** (for search)
- **Hedera Account** (testnet for betting)
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/devesh1011/ethonline2025-hack.git
cd ethonline2025-hack
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd hedera-client-interface
npm install

# Install Research Agent dependencies
cd ../remote_agents/research_agent
npm install

# Install Polymarket Agent dependencies
cd ../polymarket_agent
npm install

# Install Bettor Agent dependencies
cd ../bettor_agent
npm install
```

3. **Configure environment variables**

Create `.env` files in each agent directory:

**Frontend (`hedera-client-interface/.env`)**
```env
NEXT_PUBLIC_POLYMARKET_WS=wss://ws-subscriptions-clob.polymarket.com/ws/market
```

**Research Agent (`remote_agents/research_agent/.env`)**
```env
GOOGLE_API_KEY=your_google_api_key
TAVILY_API_KEY=your_tavily_api_key
PORT=8002
```

**Polymarket Agent (`remote_agents/polymarket_agent/.env`)**
```env
GOOGLE_API_KEY=your_google_api_key
POLYMARKET_API_URL=https://gamma-api.polymarket.com
PORT=8001
```

**Bettor Agent (`remote_agents/bettor_agent/.env`)**
```env
GOOGLE_API_KEY=your_google_api_key
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=your_hedera_account_id
HEDERA_OPERATOR_KEY=your_hedera_private_key
BETTING_CONTRACT_ID=your_contract_id
PORT=8003
```

4. **Start the services**

Open 4 separate terminals:

**Terminal 1: Research Agent**
```bash
cd remote_agents/research_agent
npm start
# Runs on http://localhost:8002
```

**Terminal 2: Polymarket Agent** (optional)
```bash
cd remote_agents/polymarket_agent
npm start
# Runs on http://localhost:8001
```

**Terminal 3: Bettor Agent** (optional)
```bash
cd remote_agents/bettor_agent
npm start
# Runs on http://localhost:8003
```

**Terminal 4: Frontend**
```bash
cd hedera-client-interface
npm run dev
# Runs on http://localhost:3000
```

5. **Open the application**
```
http://localhost:3000
```

---

## 📁 Project Structure

```
ethonline2025-hack/
├── hedera-client-interface/       # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/              # API routes
│   │   │   │   ├── chat/         # Chat endpoint (Host Agent)
│   │   │   │   └── polymarket/   # Market data endpoint
│   │   │   ├── chat/             # Chat page with markets grid
│   │   │   └── layout.tsx        # Root layout
│   │   ├── components/           # React components
│   │   │   ├── Chat.tsx          # Chat interface with markdown
│   │   │   └── ...
│   │   └── lib/                  # Utilities
│   ├── public/                   # Static assets
│   └── package.json
│
├── remote_agents/                # A2A Agents
│   ├── research_agent/           # Market analysis agent
│   │   ├── agent.ts              # Agent definition with tools
│   │   ├── tools.ts              # CoinGecko, Tavily, Technical Analysis
│   │   ├── agentExecutor.ts     # A2A server implementation
│   │   ├── index.ts              # Entry point
│   │   └── package.json
│   │
│   ├── polymarket_agent/         # Trading execution agent
│   │   ├── agent.ts
│   │   ├── tools.ts              # Polymarket API integration
│   │   ├── agentExecutor.ts
│   │   ├── index.ts
│   │   └── package.json
│   │
│   └── bettor_agent/             # Blockchain settlement agent
│       ├── agent.ts
│       ├── tools.ts              # Hedera SDK, x402 protocol
│       ├── instructions.ts       # Agent system prompt
│       ├── agentExecutor.ts
│       ├── index.ts
│       └── package.json
│
├── server/                       # Host Agent (orchestrator)
│   ├── initialize-agent.ts      # LangGraph workflow
│   └── ...
│
└── README.md
```

---

## 🤖 Agent Details

### 1. Research Agent (Port 8002)

**Purpose:** Market analysis and prediction generation

**Tools:**
- `internet_search` - Tavily API for news and events
- `get_crypto_price_data` - Real-time prices from CoinGecko
- `get_crypto_historical_data` - Historical trends and volatility
- `get_crypto_market_trend` - Market sentiment analysis
- `calculate_technical_indicators` - RSI, MACD, Bollinger Bands, Moving Averages

**Input:** Market question or event ID

**Output:**
```json
{
  "summary": "Analysis with evidence",
  "market_type": "binary" | "continuous",
  "what_to_bet": "yes" | "no" | 2.75,
  "confidence": "high" | "medium" | "low",
  "technical_signals": ["MACD bullish", "RSI neutral"],
  "data_sources": ["CoinGecko", "Technical Indicators"]
}
```

### 2. Polymarket Agent (Port 8001)

**Purpose:** Fetch market data and execute trades

**Tools:**
- Market data retrieval from Polymarket API
- CLOB order book analysis
- Trade execution interface

**Input:** User preferences, event data

**Output:** Market details, prices, trade confirmation

### 3. Bettor Agent (Port 8003)

**Purpose:** Blockchain transaction execution

**Tools:**
- `trigger_x402_payment` - Create payment request
- `record_bet` - Store bet on-chain
- `check_market_resolution` - Query Polymarket for outcomes
- `get_winning_bets` - Fetch winners from backend
- `trigger_payout` - Execute Hedera transfer to winners

**Input:** Payment intent with user account, amount, market ID

**Output:** Transaction hash, payment URL, settlement confirmation

---

## 📡 API Documentation

### Chat Endpoint

**POST** `/api/chat`

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Research this prediction market: \"Will Bitcoin reach $100k?\""
    }
  ]
}
```

**Response:**
```json
{
  "output": "**Analysis**: Bitcoin currently at $43,500...",
  "transactionBytes": null
}
```

### Polymarket Endpoint

**GET** `/api/polymarket`

**Response:**
```json
[
  {
    "id": "123",
    "title": "Will Bitcoin reach $100k?",
    "description": "...",
    "end_date": "2025-12-31",
    "volume": "1000000"
  }
]
```

### Research Agent Endpoint

**POST** `http://localhost:8002/invoke`

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyze XRP price for October"
    }
  ]
}
```

---

## 💡 Usage Examples

### 1. Ask for Price Prediction

**User:** "What price will XRP hit in October?"

**AI Response:**
```
**Analysis**: XRP currently at $2.45. Technical indicators show:
- RSI: 58 (neutral momentum)
- MACD: Bullish crossover above signal line
- Support at $2.20, resistance at $2.80
- Historical volatility suggests target range $2.50-$2.95

**Price Target**: $2.75
**Confidence**: Medium
**Technical Signals**: MACD bullish, Support at $2.20, Resistance at $2.80
```

### 2. Binary Market Analysis

**User:** "Will Bitcoin reach $100k by end of 2025?"

**AI Response:**
```
**Analysis**: Bitcoin at $43,500, up 56% YTD. Strong bullish momentum:
- RSI at 65 (overbought but holding)
- Price above 50-day MA ($41,200)
- Volume: $28B daily (healthy market)
- News: Institutional adoption increasing

**Recommendation**: YES
**Confidence**: High (72%)
**Reasoning**: Multiple bullish signals align with uptrend continuation
```

### 3. One-Click Market Research

1. Browse markets on the main page
2. Click **"AI Research"** button on any market
3. Chat input auto-populates with market title
4. AI analyzes and returns recommendation in seconds

---

## ⚙️ Configuration

### Agent Configuration

Each agent can be configured via environment variables:

**Model Settings:**
- `GOOGLE_API_KEY` - Gemini API key
- Temperature (in code): 0.3-0.5 for deterministic responses

**API Keys:**
- `TAVILY_API_KEY` - For internet search
- `POLYMARKET_API_URL` - Polymarket API endpoint

**Blockchain:**
- `HEDERA_NETWORK` - testnet or mainnet
- `HEDERA_OPERATOR_ID` - Your Hedera account
- `HEDERA_OPERATOR_KEY` - Private key

### Frontend Configuration

**WebSocket URL:**
```env
NEXT_PUBLIC_POLYMARKET_WS=wss://ws-subscriptions-clob.polymarket.com/ws/market
```

### Environment Variables (Production)

Ensure all API keys and credentials are set in production environment:
- Google API Key
- Tavily API Key
- Hedera credentials
- Polymarket API URL