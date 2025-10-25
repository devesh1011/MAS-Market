import { LoaderCircle } from 'lucide-react';
import { ChatMessage } from '@/shared/types';

type ChatProps = {
  isLoading: boolean;
  chatHistory: ChatMessage[];
};

export function Chat({ chatHistory, isLoading }: ChatProps) {
  return (
    <div className="flex flex-col gap-4">
      {chatHistory.map((message, idx) => (
        <div key={idx} className="flex">
          {message.type === 'human' ? (
            <div className="bg-white text-black inline-block px-4 py-3 rounded-lg ml-auto font-medium max-w-[80%]">
              {message.content}
            </div>
          ) : (
            <div className="bg-transparent text-white inline-block px-4 py-3 rounded-lg break-words border border-zinc-800 max-w-[80%]">
              {message.content}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div>
          <div className="bg-transparent text-white inline-block px-4 py-3 rounded-lg border border-zinc-800">
            <LoaderCircle className="animate-spin text-white" />
          </div>
        </div>
      )}

      {chatHistory.length === 0 && !isLoading && (
        <div className="text-center text-zinc-500 py-8">
          <p>Start a conversation by asking about prediction markets</p>
        </div>
      )}
    </div>
  );
}
