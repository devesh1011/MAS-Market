/**
 * Polymarket WebSocket Client for Real-Time Market Data
 * Connects to CLOB WebSocket to stream live prices
 */

interface OrderLevel {
  price: string;
  size: string;
}

interface PriceChangeItem {
  asset_id: string;
  price: string;
  size: string;
  side: string;
  best_bid: string;
  best_ask: string;
}

interface BookMessage {
  event_type: string;
  asset_id: string;
  bids: OrderLevel[];
  asks: OrderLevel[];
  timestamp: number;
}

interface PriceChangeMessage {
  event_type: string;
  price_changes: PriceChangeItem[];
  timestamp: number;
}

interface LastTradePriceMessage {
  event_type: string;
  asset_id: string;
  price: string;
  timestamp: number;
}

export interface PriceUpdate {
  assetId: string;
  bestBid: string;
  bestAsk: string;
  timestamp: number;
}

export interface MarketPrices {
  [assetId: string]: {
    bid: string;
    ask: string;
    mid: number; // Percentage 0-1
    timestamp: number;
  };
}

class PolymarketWebSocket {
  private ws: WebSocket | null = null;
  private url = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
  private pricesMap: MarketPrices = {};
  private assetIds: Set<string> = new Set();
  private listeners: ((prices: MarketPrices) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  /**
   * Subscribe to price updates for given asset IDs
   */
  subscribe(assetIds: string[], onUpdate: (prices: MarketPrices) => void) {
    this.listeners.push(onUpdate);
    assetIds.forEach((id) => this.assetIds.add(id));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    } else {
      this.sendSubscription();
    }
  }

  /**
   * Connect to WebSocket and setup event handlers
   */
  private connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('Connected to Polymarket CLOB WebSocket');
        this.reconnectAttempts = 0;
        this.sendSubscription();
      };

      this.ws.onmessage = (event) => {
        try {
          // Skip non-JSON messages like PONG keepalive frames
          if (typeof event.data !== 'string' || !event.data.trim().startsWith('{')) {
            return;
          }
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          // Silently ignore JSON parse errors for ping/pong frames
          if (!event.data || (typeof event.data === 'string' && event.data.trim() === 'PONG')) {
            return;
          }
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from Polymarket CLOB WebSocket');
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }

  /**
   * Send subscription message with asset IDs
   */
  private sendSubscription() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const assetIdsArray = Array.from(this.assetIds);
    if (assetIdsArray.length === 0) {
      return;
    }

    const subscription = {
      assets_ids: assetIdsArray,
      type: 'market',
    };

    try {
      this.ws.send(JSON.stringify(subscription));
      console.log(`Subscribed to ${assetIdsArray.length} assets`);
    } catch (error) {
      console.error('Error sending subscription:', error);
    }
  }

  /**
   * Handle message - incoming WebSocket messages
   */
  private handleMessage(data: Record<string, unknown>) {
    const eventType = data.event_type as string;

    switch (eventType) {
      case 'book':
        this.handleBookMessage(data as unknown as BookMessage);
        break;
      case 'price_change':
        this.handlePriceChangeMessage(data as unknown as PriceChangeMessage);
        break;
      case 'last_trade_price':
        this.handleLastTradePrice(data as unknown as LastTradePriceMessage);
        break;
      default:
        // Ignore other message types
        break;
    }
  }

  /**
   * Handle book message - full orderbook snapshot
   */
  private handleBookMessage(data: BookMessage) {
    const { asset_id, bids, asks } = data;

    if (!asset_id) return;

    const bestBid = bids && bids.length > 0 ? bids[0].price : '0';
    const bestAsk = asks && asks.length > 0 ? asks[0].price : '1';

    this.updatePrice(asset_id, bestBid, bestAsk, data.timestamp);
  }

  /**
   * Handle price change message - incremental updates
   */
  private handlePriceChangeMessage(data: PriceChangeMessage) {
    const { price_changes } = data;

    if (!Array.isArray(price_changes)) return;

    price_changes.forEach((change: PriceChangeItem) => {
      const { asset_id, best_bid, best_ask } = change;

      if (asset_id && best_bid !== undefined && best_ask !== undefined) {
        this.updatePrice(asset_id, best_bid.toString(), best_ask.toString(), data.timestamp);
      }
    });
  }

  /**
   * Handle last trade price message
   */
  private handleLastTradePrice(data: LastTradePriceMessage) {
    const { asset_id, price } = data;

    if (!asset_id || !price) return;

    // For last trade, use it as both bid and ask reference
    const current = this.pricesMap[asset_id];
    if (current) {
      this.updatePrice(asset_id, current.bid, price, data.timestamp);
    }
  }

  /**
   * Update price in cache and notify listeners
   */
  private updatePrice(assetId: string, bid: string, ask: string, timestamp: number) {
    const bidNum = parseFloat(bid) || 0;
    const askNum = parseFloat(ask) || 1;

    // Mid price as percentage (0-1)
    const midPrice = (bidNum + askNum) / 2;

    this.pricesMap[assetId] = {
      bid,
      ask,
      mid: midPrice,
      timestamp: timestamp || Date.now(),
    };

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(this.pricesMap);
      } catch (error) {
        console.error('Error calling price update listener:', error);
      }
    });
  }

  /**
   * Get current price for an asset
   */
  getPrice(assetId: string) {
    return this.pricesMap[assetId] || null;
  }

  /**
   * Get all current prices
   */
  getAllPrices() {
    return { ...this.pricesMap };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const polymarketWs = new PolymarketWebSocket();
