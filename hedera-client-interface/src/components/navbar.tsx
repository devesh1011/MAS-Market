'use client';

import { WalletButton } from '@/components/wallet-button';
import { useDAppConnector } from '@/components/client-providers';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function Navbar() {
  const dAppContext = useDAppConnector();
  const router = useRouter();
  const pathname = usePathname();
  const isWalletConnected = !!dAppContext?.dAppConnector?.signers[0];
  const isOnChatPage = pathname === '/chat';

  const handleGetStarted = () => {
    router.push('/chat');
  };

  return (
    <nav className="w-full bg-black border-b border-zinc-800">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-white">
            MAS
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <WalletButton />
          {isWalletConnected && !isOnChatPage && (
            <motion.button
              onClick={handleGetStarted}
              className="px-6 py-2 rounded-lg font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <span className="flex items-center gap-2 text-sm">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </nav>
  );
}
