'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ResearchChatProps {
  marketTitle: string;
  marketDescription: string;
  onClose: () => void;
}

export function ResearchChat({ marketTitle, marketDescription, onClose }: ResearchChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-trigger research when component mounts
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      // Automatically start the research
      performResearch(
        'Analyze this prediction market and provide insights on the current odds, key factors, and a recommendation on what to bet.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performResearch = async (query: string) => {
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: 'Starting AI research...' }]);

    try {
      // Build the full query with market context
      const contextualQuery = `Research this prediction market: "${marketTitle}". ${marketDescription}\n\nUser question: ${query}`;

      // Call the existing /api/chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: contextualQuery,
          history: [],
          userAccountId: '0.0.123456', // Default account ID - can be made dynamic later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const data = await response.json();
      setMessages([{ role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error calling chat API:', error);
      setMessages([
        {
          role: 'assistant',
          content:
            'Sorry, I encountered an error starting the research. Please try asking a question.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build the full query with market context
      const contextualQuery = `Research this prediction market: "${marketTitle}". ${marketDescription}\n\nUser question: ${userMessage}`;

      // Build chat history for the API
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call the existing /api/chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: contextualQuery,
          history,
          userAccountId: '0.0.123456', // Default account ID - can be made dynamic later
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error calling chat API:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex-1 pr-4">
          <h3 className="text-white font-semibold text-sm line-clamp-1">{marketTitle}</h3>
          <p className="text-zinc-400 text-xs">AI Research Assistant</p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-100 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this market..."
            className="flex-1 bg-zinc-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
