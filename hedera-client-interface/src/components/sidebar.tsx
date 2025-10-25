'use client';

import { motion } from 'framer-motion';
import { TrendingUp, HelpCircle } from 'lucide-react';

type SidebarProps = {
  activeSection: 'market' | 'how-it-works';
  onSectionChange: (section: 'market' | 'how-it-works') => void;
};

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const sections = [
    { id: 'market' as const, label: 'market', icon: TrendingUp },
    { id: 'how-it-works' as const, label: 'how it works ?', icon: HelpCircle },
  ];

  return (
    <div className="w-56 h-full bg-black border-r border-zinc-800 flex flex-col">
      <div className="flex flex-col p-4 gap-2">
        {sections.map((section) => (
          <motion.button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`
              px-4 py-3 rounded-lg text-left transition-colors flex items-center gap-3
              ${
                activeSection === section.id
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white hover:bg-zinc-900 border border-zinc-800'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <section.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{section.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

