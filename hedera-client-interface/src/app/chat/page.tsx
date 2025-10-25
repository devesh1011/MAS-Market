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
  const { dAppConnector } = useDAppConnector();
  const router = useRouter();

  // Redirect to home if wallet is not connected
  useEffect(() => {
    if (!dAppConnector?.signers[0]) {
      router.push('/');
    }
  }, [dAppConnector, router]);

  async function handleUserMessage() {
    const currentPrompt = prompt;
    setPrompt('');

    setChatHistory((v) => [
      ...v,
      {
        type: 'human',
        content: currentPrompt,
      },
    ]);

    const agentResponse = await mutateAsync({
      userAccountId: dAppConnector?.signers[0].getAccountId().toString() ?? '',
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

    if (agentResponse.transactionBytes) {
      const result = await dAppConnector?.signAndExecuteTransaction({
        signerAccountId: dAppConnector?.signers[0].getAccountId().toString() ?? '',
        transactionList: agentResponse.transactionBytes,
      });
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

  return (
    <div className="h-screen w-full bg-black flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex">
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

