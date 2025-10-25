'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type BetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  betDirection: 'yes' | 'no';
  marketTitle: string;
  onPlaceBet: (amount: string) => void;
};

export function BetModal({ isOpen, onClose, betDirection, marketTitle, onPlaceBet }: BetModalProps) {
  const [amount, setAmount] = useState('');

  console.log('BetModal render:', { isOpen, betDirection, marketTitle });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && parseFloat(amount) > 0) {
      onPlaceBet(amount);
      setAmount('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <h2 className="text-xl font-semibold text-white">Place Bet</h2>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Market Info */}
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Betting on</p>
                  <p className="text-white font-medium">{marketTitle}</p>
                </div>

                {/* Bet Direction */}
                <div>
                  <p className="text-sm text-zinc-400 mb-2">Your position</p>
                  <div
                    className={`inline-flex px-4 py-2 rounded-lg font-semibold ${
                      betDirection === 'yes'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {betDirection.toUpperCase()}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label htmlFor="amount" className="block text-sm text-zinc-400 mb-2">
                    Amount (HBAR)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Place Bet
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

