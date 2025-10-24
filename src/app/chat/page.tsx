'use client';

import { ChatMessage } from '@/shared/types';
import { useState } from 'react';
import { useHandleChat } from '@/lib/handle-chat';
import { ChatInput } from '@/components/chat-input';
import { Navbar } from '@/components/navbar';
import { useDAppConnector } from '@/components/client-providers';
import { Chat } from '@/components/chat';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const { mutateAsync, isPending } = useHandleChat();
  const router = useRouter();

  const dAppConnectorContext = useDAppConnector();
  const userAccountId = dAppConnectorContext?.userAccountId;

  useEffect(() => {
    if (!userAccountId) {
      router.push('/');
    }
  }, [userAccountId, router]);

  async function handleUserMessage() {
    const currentPrompt = prompt;
    setPrompt('');

    setChatHistory((prev) => [
      ...prev,
      { type: 'human', content: currentPrompt },
    ]);

    try {
      const response = await mutateAsync({
        input: currentPrompt,
        history: chatHistory,
        userAccountId: userAccountId ?? '',
      });

      setChatHistory((prev) => [
        ...prev,
        { type: 'ai', content: response.message },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory((prev) => [
        ...prev,
        { type: 'ai', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    }
  }

  if (!userAccountId) {
    return null; // Will redirect to landing page
  }

  return (
    <div className="h-screen w-full bg-black flex flex-col relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-dot-pattern"></div>
      </div>
      
      {/* Navbar */}
      <Navbar />
      
      {/* Main content */}
      <main className="flex-1 flex relative z-10">
        {/* Left side - empty space */}
        <div className="flex-1"></div>
        
        {/* Right side - chat components */}
        <div className="w-96 h-full flex flex-col p-6">
          <Chat chatHistory={chatHistory} isLoading={isPending} />

          <ChatInput
            handleUserMessage={handleUserMessage}
            prompt={prompt}
            setPrompt={setPrompt}
            isPending={isPending}
          />
        </div>
      </main>
    </div>
  );
}
