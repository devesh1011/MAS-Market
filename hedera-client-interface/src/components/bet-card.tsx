'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

type BetCardProps = {
  title: string;
  description?: string;
  yesOdds?: number;
  noOdds?: number;
  onBet: (direction: 'yes' | 'no') => void;
};

export function BetCard({ title, description, yesOdds, noOdds, onBet }: BetCardProps) {
  return (
    <motion.div
      className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Market Title */}
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <h3 className="text-white font-semibold leading-tight">{title}</h3>
        </div>
        {description && (
          <p className="text-sm text-zinc-400 ml-7">{description}</p>
        )}
      </div>

      {/* Odds Display (if available) */}
      {(yesOdds || noOdds) && (
        <div className="flex gap-2 mb-3 ml-7">
          {yesOdds && (
            <div className="text-xs text-zinc-500">
              Yes: <span className="text-green-400 font-medium">{yesOdds}%</span>
            </div>
          )}
          {noOdds && (
            <div className="text-xs text-zinc-500">
              No: <span className="text-red-400 font-medium">{noOdds}%</span>
            </div>
          )}
        </div>
      )}

      {/* Yes/No Buttons */}
      <div className="flex gap-2">
        <motion.button
          onClick={() => {
            console.log('YES button clicked!');
            onBet('yes');
          }}
          className="flex-1 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg font-semibold hover:bg-green-500/20 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Yes
        </motion.button>
        <motion.button
          onClick={() => {
            console.log('NO button clicked!');
            onBet('no');
          }}
          className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg font-semibold hover:bg-red-500/20 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          No
        </motion.button>
      </div>
    </motion.div>
  );
}

