'use client';

import { Dispatch, SetStateAction } from 'react';

type ChatInputProps = {
  isPending: boolean;
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  handleUserMessage: () => void;
};

export function ChatInput({ handleUserMessage, setPrompt, isPending, prompt }: ChatInputProps) {
  return (
    <form className="flex py-4 gap-3" onSubmit={(e) => e.preventDefault()}>
      <input
        disabled={isPending}
        className="grow px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-500 transition-all duration-200 text-sm"
        placeholder="Ask about your HBAR balance..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        disabled={isPending}
        type="submit"
        className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
        onClick={handleUserMessage}
      >
        Send
      </button>
    </form>
  );
}
