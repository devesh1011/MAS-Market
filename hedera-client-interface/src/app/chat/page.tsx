'use client';

import { ChatMessage } from '@/shared/types';
import { useState, useEffect } from 'react';
import { useHandleChat } from '@/lib/handle-chat';
import { Navbar } from '@/components/navbar';
import { useDAppConnector } from '@/components/client-providers';
import { Chat } from '@/components/chat';
import { Sidebar } from '@/components/sidebar';
import { BetModal } from '@/components/bet-modal';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { LoaderCircle, Brain } from 'lucide-react';
import Image from 'next/image';
import { polymarketWs, type MarketPrices } from '@/lib/polymarket-websocket';

interface MarketEvent {
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
  yesPrice: number;
  noPrice: number;
  tags: Array<{ label: string; slug: string }>;
}

export default function ChatPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sidePrompt, setSidePrompt] = useState('');
  const [activeSection, setActiveSection] = useState<'market' | 'how-it-works'>('market');
  const [markets, setMarkets] = useState<MarketEvent[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [marketsError, setMarketsError] = useState<string | null>(null);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<{ direction: 'yes' | 'no'; marketTitle: string } | null>(null);
  const { mutateAsync, isPending } = useHandleChat();
  const dAppContext = useDAppConnector();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!dAppContext?.dAppConnector?.signers[0]) {
      router.push('/');
    }
  }, [dAppContext, router]);

  // Auto-populate chat with market data from URL params
  useEffect(() => {
    const marketTitle = searchParams.get('title');
    const marketDescription = searchParams.get('description');
    const marketId = searchParams.get('marketId');

    if (marketTitle && marketDescription && marketId) {
      // Create initial message about the market
      const marketQuery = `I'm interested in analyzing this prediction market:\n\nTitle: ${marketTitle}\n\nDescription: ${marketDescription}\n\nCan you research this event and provide your analysis with a betting recommendation?`;

      setSidePrompt(marketQuery);

      // Clear URL params after reading
      router.replace('/chat', { scroll: false });
    }
  }, [searchParams, router]);

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

  // Fetch markets when activeSection is 'market'
  useEffect(() => {
    if (activeSection !== 'market') return;

    const fetchMarkets = async () => {
      try {
        setIsLoadingMarkets(true);
        setMarketsError(null);
        // Use internal API route to avoid CORS issues
        const response = await fetch('/api/polymarket');

        if (!response.ok) {
          throw new Error('Failed to fetch markets');
        }

        const data = await response.json();
        const { events, assetIds } = data;

        // Initialize markets with placeholder prices
        const initialMarkets: MarketEvent[] = events.map((event: MarketEvent) => ({
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
        setMarketsError(err instanceof Error ? err.message : 'Failed to load markets');
      } finally {
        setIsLoadingMarkets(false);
      }
    };

    fetchMarkets();

    // Cleanup WebSocket on unmount or section change
    return () => {
      polymarketWs.disconnect();
    };
  }, [activeSection]);

  // Handle opening bet modal
  function handleOpenBetModal(direction: 'yes' | 'no', marketTitle: string) {
    console.log('handleOpenBetModal called:', { direction, marketTitle });
    setSelectedBet({ direction, marketTitle });
    setBetModalOpen(true);
    console.log('Modal should now be open');
  }

  // Handle placing bet - Simple direct Hedera transaction
  async function handlePlaceBet(amount: string) {
    if (!selectedBet || !dAppContext?.dAppConnector) return;
    
    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const userAccountId = dAppContext.dAppConnector.signers[0].getAccountId().toString();
      
      // Hardcoded bettor agent account (replace with your actual account)
      const BETTOR_AGENT_ACCOUNT = process.env.NEXT_PUBLIC_BETTOR_AGENT_ID || '0.0.5207193';
      
      console.log('Placing bet via direct Hedera transaction:', { 
        direction: selectedBet.direction, 
        market: selectedBet.marketTitle, 
        amount: betAmount,
        from: userAccountId,
        to: BETTOR_AGENT_ACCOUNT,
      });

      // Create transaction memo with bet details (MUST be under 100 bytes for Hedera)
      // Format: "YES 5 HBAR - Market Title (truncated if needed)"
      const directionText = selectedBet.direction.toUpperCase();
      const amountText = `${betAmount} HBAR`;
      
      // Truncate market title to fit in 100 bytes
      const prefix = `${directionText} ${amountText} - `;
      const maxMarketLength = 95 - prefix.length; // Leave some buffer
      let marketTitle = selectedBet.marketTitle;
      if (marketTitle.length > maxMarketLength) {
        marketTitle = marketTitle.substring(0, maxMarketLength - 3) + '...';
      }
      
      const betMemo = `${prefix}${marketTitle}`;
      
      // Ensure it's under 100 bytes (UTF-8 encoded)
      const finalMemo = betMemo.length > 100 ? betMemo.substring(0, 97) + '...' : betMemo;

      console.log('Transaction details:', {
        from: userAccountId,
        to: BETTOR_AGENT_ACCOUNT,
        amount: `${betAmount} HBAR`,
        memo: finalMemo,
        memoLength: finalMemo.length,
      });

      console.log('Creating bet transfer transaction...');

      // Call API to create transaction bytes (without any signature)
      const createTxResponse = await fetch('/api/create-bet-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: userAccountId,
          to: BETTOR_AGENT_ACCOUNT,
          amount: betAmount.toString(),
          memo: finalMemo,
        }),
      });

      if (!createTxResponse.ok) {
        const error = await createTxResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to create transaction');
      }

      const { transactionBytes } = await createTxResponse.json();
      console.log('Transaction bytes created, sending to wallet for signing...');

      // Send to wallet for user to sign and execute
      const result = await dAppContext.dAppConnector.signAndExecuteTransaction({
        signerAccountId: userAccountId,
        transactionList: transactionBytes,
      });

      if (result && 'transactionId' in result) {
        const transactionId = result.transactionId;
        console.log('✅ Transaction successful:', transactionId);

        // Track the bet in the system
        try {
          const trackResponse = await fetch('/api/track-bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userAccountId,
              amount: betAmount.toString(),
              marketId: selectedBet.marketTitle,
              marketTitle: selectedBet.marketTitle,
              direction: selectedBet.direction,
              transactionId: transactionId,
            }),
          });

          if (trackResponse.ok) {
            const trackData = await trackResponse.json();
            console.log('✅ Bet tracked:', trackData.betId);
          } else {
            console.error('Failed to track bet');
          }
        } catch (error) {
          console.error('Error tracking bet:', error);
        }

        setChatHistory((v) => [
          ...v,
          {
            type: 'ai',
            content: `✅ Bet placed successfully!\n\n**Transaction ID:** ${transactionId}\n**Amount:** ${betAmount} HBAR\n**Direction:** ${selectedBet.direction.toUpperCase()}\n**Market:** ${selectedBet.marketTitle}\n\n[View on HashScan](https://hashscan.io/testnet/transaction/${transactionId})\n\n_Your bet is being held in escrow. You'll receive a payout if you win!_`,
          },
        ]);
      }

      // Close modal
      setBetModalOpen(false);
      setSelectedBet(null);
      
    } catch (error) {
      console.error('❌ Error placing bet:', error);
      alert(`❌ Error placing bet:\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
      
      setBetModalOpen(false);
      setSelectedBet(null);
    }
  }

  // Handle side chat messages
  async function handleSideChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!sidePrompt.trim()) return;

    const currentPrompt = sidePrompt;
    setSidePrompt('');

    setChatHistory((v) => [
      ...v,
      {
        type: 'human',
        content: currentPrompt,
      },
    ]);

    const agentResponse = await mutateAsync({
      userAccountId: dAppContext?.dAppConnector?.signers[0].getAccountId().toString() ?? '',
      input: currentPrompt,
      history: chatHistory,
    });

    setChatHistory((v) => [
      ...v,
      {
        type: 'ai',
        content: agentResponse.message,
      },
    ]);

    if (agentResponse.transactionBytes && dAppContext?.dAppConnector) {
      const result = await dAppContext.dAppConnector.signAndExecuteTransaction({
        signerAccountId: dAppContext.dAppConnector.signers[0].getAccountId().toString(),
        transactionList: agentResponse.transactionBytes,
      });
      
      if (result) {
        const transactionId = 'transactionId' in result ? result.transactionId : null;
        setChatHistory((v) => [
          ...v,
          {
            type: 'ai',
            content: `Transaction signed and executed sucessfully, txId: ${transactionId}`,
          },
        ]);
      }
    }
  }

  return (
    <div className="h-screen w-full bg-black flex flex-col">
      <Navbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        {/* Center Content - Conditional Display */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          {activeSection === 'market' ? (
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Prediction Markets</h1>
                <p className="text-zinc-400">Bet on real-world events with AI-powered insights</p>
              </div>

              {/* Loading State */}
              {isLoadingMarkets && (
                <div className="flex items-center justify-center py-20">
                  <LoaderCircle className="animate-spin text-white h-10 w-10" />
                </div>
              )}

              {/* Error State */}
              {marketsError && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
                  {marketsError}
                </div>
              )}

              {/* Markets Grid */}
              {!isLoadingMarkets && !marketsError && (
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

                        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                          {market.description}
                        </p>
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

                        {/* Yes/No Prices with Bet Buttons */}
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => handleOpenBetModal('yes', market.title)}
                            className="flex-1 bg-green-500/10 border border-green-500/30 rounded p-2 hover:bg-green-500/20 transition-colors cursor-pointer"
                          >
                            <div className="text-xs text-green-400 mb-1">YES</div>
                            <div className="text-lg font-bold text-green-400">
                              {(market.yesPrice * 100).toFixed(0)}%
                            </div>
                          </button>
                          <button
                            onClick={() => handleOpenBetModal('no', market.title)}
                            className="flex-1 bg-red-500/10 border border-red-500/30 rounded p-2 hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            <div className="text-xs text-red-400 mb-1">NO</div>
                            <div className="text-lg font-bold text-red-400">
                              {(market.noPrice * 100).toFixed(0)}%
                            </div>
                          </button>
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
                          onClick={() => {
                            const researchQuery = `Research this prediction market: "${market.title}"`;
                            setSidePrompt(researchQuery);
                          }}
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
              {!isLoadingMarkets && !marketsError && markets.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-zinc-400 text-lg">No active markets found</p>
                </div>
              )}
            </div>
          ) : (
            // How It Works Steps
            <motion.div
              className="w-full max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl font-bold text-white mb-12 text-center">How It Works</h2>
              <div className="grid grid-cols-2 gap-8">
                {[
                  {
                    number: 1,
                    title: 'Connect',
                    description: 'Connect your Hedera wallet securely to get started',
                  },
                  {
                    number: 2,
                    title: 'Ask',
                    description: 'Query prediction markets or request detailed analysis',
                  },
                  {
                    number: 3,
                    title: 'Analyze',
                    description: 'AI agents research and provide evidence-based recommendations',
                  },
                  {
                    number: 4,
                    title: 'Execute',
                    description: 'Sign and execute transactions securely on-chain',
                  },
                ].map((step, index) => (
                  <motion.div
                    key={step.number}
                    className="border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xl flex-shrink-0">
                        {step.number}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                        <p className="text-zinc-400 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right side - Chat Interface (Independent) */}
        <div className="w-96 h-full flex flex-col border-l border-zinc-800">
          <div className="flex-1 overflow-y-auto p-6">
            <Chat 
              chatHistory={chatHistory} 
              isLoading={isPending}
              onOpenBetModal={handleOpenBetModal}
            />
          </div>
          
          {/* Chat input at bottom */}
          <div className="p-6 border-t border-zinc-800">
            <form onSubmit={handleSideChatMessage} className="relative">
              <input
                type="text"
                value={sidePrompt}
                onChange={(e) => setSidePrompt(e.target.value)}
                placeholder="Type your message..."
                disabled={isPending}
                className="w-full px-4 py-3 pr-12 bg-transparent border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isPending || !sidePrompt.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-zinc-400 transition-colors disabled:opacity-50"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Bet Modal */}
      <BetModal
        isOpen={betModalOpen}
        onClose={() => {
          setBetModalOpen(false);
          setSelectedBet(null);
        }}
        betDirection={selectedBet?.direction || 'yes'}
        marketTitle={selectedBet?.marketTitle || ''}
        onPlaceBet={handlePlaceBet}
      />
    </div>
  );
}
