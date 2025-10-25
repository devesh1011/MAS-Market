'use client';

import { ChatMessage } from '@/shared/types';
import { useState, useEffect } from 'react';
import { useHandleChat } from '@/lib/handle-chat';
import { Navbar } from '@/components/navbar';
import { useDAppConnector } from '@/components/client-providers';
import { Chat } from '@/components/chat';
import { Sidebar } from '@/components/sidebar';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChatPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sidePrompt, setSidePrompt] = useState('');
  const [middleSearch, setMiddleSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'market' | 'how-it-works'>('market');
  const { mutateAsync, isPending } = useHandleChat();
  const dAppContext = useDAppConnector();
  const router = useRouter();

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!dAppContext?.dAppConnector?.signers[0]) {
      router.push('/');
    }
  }, [dAppContext, router]);

  // Handle middle search bar (separate functionality)
  async function handleMiddleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!middleSearch.trim()) return;
    
    console.log('Middle search:', middleSearch);
    // TODO: Add middle section functionality here
    // This is separate from the side chat
    setMiddleSearch('');
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
        <div className="flex-1 flex items-center justify-center px-12">
          {activeSection === 'market' ? (
            // Market Search Bar
            <motion.form
              onSubmit={handleMiddleSearch}
              className="w-full max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <input
                  type="text"
                  value={middleSearch}
                  onChange={(e) => setMiddleSearch(e.target.value)}
                  placeholder="what you wanna bet on ?"
                  className="w-full px-6 py-4 pr-14 bg-transparent border-2 border-white rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors text-lg"
                />
                <button
                  type="submit"
                  disabled={!middleSearch.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-zinc-400 transition-colors disabled:opacity-50"
                >
                  <Search className="w-6 h-6" />
                </button>
              </div>
            </motion.form>
          ) : (
            // How It Works Steps
            <motion.div
              className="w-full max-w-4xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl font-bold text-white mb-12 text-center">
                How It Works
              </h2>
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
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {step.title}
                        </h3>
                        <p className="text-zinc-400 leading-relaxed">
                          {step.description}
                        </p>
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
            <Chat chatHistory={chatHistory} isLoading={isPending} />
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
    </div>
  );
}

