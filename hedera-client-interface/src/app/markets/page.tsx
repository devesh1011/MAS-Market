'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { ResearchChat } from '@/components/research-chat';
import { LoaderCircle, Brain } from 'lucide-react';
import Image from 'next/image';
import { polymarketWs, type MarketPrices } from '@/lib/polymarket-websocket';

interface Event {
  id: string;
  assetId: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  volume: number;
  yesPrice: number; // Real YES probability from CLOB
  noPrice: number; // Real NO probability from CLOB
  tags: Array<{ label: string; slug: string }>;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Event | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setIsLoading(true);
        // Use internal API route to avoid CORS issues
        const response = await fetch('/api/polymarket');

        if (!response.ok) {
          throw new Error('Failed to fetch markets');
        }

        const data = await response.json();
        const { events, assetIds } = data;

        // Initialize markets with placeholder prices
        const initialMarkets: Event[] = events.map((event: Event) => ({
          ...event,
          yesPrice: 0.5, // Will be replaced by WebSocket updates
          noPrice: 0.5,
        }));

        setMarkets(initialMarkets);

        // Subscribe to WebSocket updates
        if (assetIds && assetIds.length > 0) {
          polymarketWs.subscribe(assetIds, (prices: MarketPrices) => {
            setMarkets((prevMarkets) =>
              prevMarkets.map((market) => {
                const price = prices[market.assetId];
                if (price) {
                  return {
                    ...market,
                    yesPrice: price.mid,
                    noPrice: 1 - price.mid,
                  };
                }
                return market;
              }),
            );
          });
        }
      } catch (err) {
        console.error('Error fetching markets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load markets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkets();

    // Cleanup WebSocket on unmount
    return () => {
      polymarketWs.disconnect();
    };
  }, []);

  const formatVolume = (volume: number | undefined) => {
    if (!volume || volume === 0) {
      return '$0';
    }
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col">
      <Navbar />

      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Prediction Markets</h1>
            <p className="text-zinc-400">Bet on real-world events with AI-powered insights</p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <LoaderCircle className="animate-spin text-white h-10 w-10" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
              {error}
            </div>
          )}

          {/* Markets Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <div
                  key={market.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-all duration-200"
                >
                  {/* Market Image */}
                  {market.image && (
                    <div className="aspect-video relative bg-zinc-800">
                      <Image
                        src={market.image}
                        alt={market.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Market Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {market.title}
                    </h3>

                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{market.description}</p>
                    {/* Tags */}
                    {market.tags && market.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {market.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.slug}
                            className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded"
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Yes/No Prices */}
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded p-2">
                        <div className="text-xs text-green-400 mb-1">YES</div>
                        <div className="text-lg font-bold text-green-400">
                          {(market.yesPrice * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded p-2">
                        <div className="text-xs text-red-400 mb-1">NO</div>
                        <div className="text-lg font-bold text-red-400">
                          {(market.noPrice * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm mb-3">
                      <div>
                        <span className="text-zinc-500">Volume: </span>
                        <span className="text-white font-medium">
                          {formatVolume(market.volume)}
                        </span>
                      </div>
                      <div className="text-zinc-500">Ends: {formatDate(market.endDate)}</div>
                    </div>

                    {/* Research Button */}
                    <button
                      onClick={() => setSelectedMarket(market)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Brain className="h-4 w-4" />
                      <span className="text-sm font-medium">AI Research</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && markets.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-400 text-lg">No active markets found</p>
            </div>
          )}
        </div>
      </main>

      {/* Research Chat Sidebar */}
      {selectedMarket && (
        <ResearchChat
          marketTitle={selectedMarket.title}
          marketDescription={selectedMarket.description}
          onClose={() => setSelectedMarket(null)}
        />
      )}
    </div>
  );
}
