'use client';

import { motion } from 'framer-motion';
import { BarChart3, Search, Link2, Shield, Sparkles, TrendingUp, Zap } from 'lucide-react';

export function Landing() {
  const features = [
    {
      icon: BarChart3,
      title: 'Market Intelligence',
      description: 'Real-time data from Polymarket with AI-powered analysis and insights',
    },
    {
      icon: Search,
      title: 'Deep Research',
      description: 'Multi-agent research system that investigates events thoroughly',
    },
    {
      icon: Link2,
      title: 'Hedera Integration',
      description: 'Seamless blockchain transactions with secure wallet signing',
    },
  ];

  const steps = [
    { icon: Shield, title: 'Connect', description: 'Connect your Hedera wallet securely' },
    { icon: Sparkles, title: 'Ask', description: 'Query prediction markets or request analysis' },
    { icon: TrendingUp, title: 'Analyze', description: 'AI agents research and provide recommendations' },
    { icon: Zap, title: 'Execute', description: 'Sign and execute transactions on-chain' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <motion.div
        className="max-w-6xl w-full text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Hero Section */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-7xl font-bold text-white mb-6 leading-tight">
            AI-Powered
            <br />
            Prediction Market Analysis
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Make informed decisions with advanced AI agents that analyze Polymarket data, 
            conduct deep research, and provide evidence-based recommendations on Hedera blockchain.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-6 mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="border border-zinc-800 rounded-lg p-8 hover:border-zinc-700 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="inline-flex p-4 rounded-lg bg-zinc-900 border border-zinc-800 mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* How It Works Section */}
        <motion.div 
          className="mt-20 pt-12 border-t border-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-white mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1 }}
                  >
                    <step.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div className="absolute top-8 left-1/2 w-full h-px bg-zinc-800 -z-10 hidden md:block" />
                  )}
                  <div className="text-white font-semibold mb-2 text-lg">
                    {index + 1}. {step.title}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

