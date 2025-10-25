import { LoaderCircle } from 'lucide-react';
import { EmptyChat } from '@/components/empty-chat';
import { ChatMessage } from '@/shared/types';

type ChatProps = {
  isLoading: boolean;
  chatHistory: ChatMessage[];
};

export function Chat({ chatHistory, isLoading }: ChatProps) {
  return (
    <div className="bg-zinc-800 grow rounded-lg flex flex-col gap-2 p-4">
      {chatHistory.map((message, idx) => (
        <div key={idx} className="flex">
          {message.type === 'human' ? (
            <div className="bg-white text-black inline-block px-4 py-2 rounded-md ml-auto font-medium">
              {message.content}
            </div>
          ) : (
            <div className="bg-zinc-800 text-white inline-block px-4 py-2 rounded-md break-all border border-zinc-700">
              {message.content}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div>
          <div className="bg-zinc-800 text-white inline-block px-4 py-2 rounded-md border border-zinc-700">
            <LoaderCircle className="animate-spin text-white" />
          </div>
        </div>
      )}

      <EmptyChat isChatEmpty={chatHistory.length <= 0} />
    </div>
  );
}
