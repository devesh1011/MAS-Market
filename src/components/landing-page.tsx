'use client';

import { WalletButton } from '@/components/wallet-button';
import { useDAppConnector } from '@/components/client-providers';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LandingPage() {
  const dAppConnectorContext = useDAppConnector();
  const userAccountId = dAppConnectorContext?.userAccountId;
  const router = useRouter();

  useEffect(() => {
    if (userAccountId) {
      router.push('/chat');
    }
  }, [userAccountId, router]);

  return (
    <div className="h-screen w-full bg-black flex flex-col relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-dot-pattern"></div>
      </div>
      
      {/* Navbar */}
      <nav className="w-full bg-gray-900 border-b border-gray-700 relative z-10">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-white">
              MAS Polymarket on Hedera
            </h1>
          </div>

          <div className="flex items-center">
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center relative z-10">
        <div className="text-center max-w-4xl mx-auto px-6">
          <h2 className="text-5xl font-bold text-white mb-6">
            Multi-Agent System for Polymarket
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Connect your Hedera wallet to access our AI-powered prediction market platform. 
            Get insights, place bets, and interact with intelligent agents.
          </p>
          
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-3">Features</h3>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• AI-powered market analysis</li>
                <li>• Real-time Polymarket integration</li>
                <li>• Hedera blockchain transactions</li>
                <li>• Multi-agent collaboration</li>
              </ul>
            </div>
            
            <div className="text-gray-400 text-sm">
              Connect your wallet to get started
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
