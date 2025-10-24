import { LoaderCircle } from 'lucide-react';
import { EmptyChat } from '@/components/empty-chat';
import { ChatMessage } from '@/shared/types';

type ChatProps = {
  isLoading: boolean;
  chatHistory: ChatMessage[];
};

export function Chat({ chatHistory, isLoading }: ChatProps) {
  return (
    <div className="grow rounded-lg flex flex-col gap-3 p-4 bg-gray-900 border border-gray-700 min-h-0">
      {chatHistory.map((message, idx) => (
        <div key={idx} className="flex">
          {message.type === 'human' ? (
            <div className="inline-block px-4 py-2 rounded-lg ml-auto bg-white text-black font-medium text-sm max-w-[80%]">
              {message.content}
            </div>
          ) : (
            <div className="inline-block px-4 py-2 rounded-lg break-all bg-gray-800 text-white text-sm max-w-[80%] border border-gray-600">
              {message.content}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div>
          <div className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600">
            <LoaderCircle className="animate-spin text-white w-4 h-4" />
          </div>
        </div>
      )}

      <EmptyChat isChatEmpty={chatHistory.length <= 0} />
    </div>
  );
}
