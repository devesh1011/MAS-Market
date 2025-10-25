import { LoaderCircle } from 'lucide-react';
import { ChatMessage } from '@/shared/types';
import ReactMarkdown from 'react-markdown';

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
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-xl font-bold mb-2" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-lg font-bold mb-2" {...props} />,
                  h3: ({ ...props }) => <h3 className="text-base font-bold mb-1" {...props} />,
                  p: ({ ...props }) => <p className="mb-2" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                  li: ({ ...props }) => <li className="mb-1" {...props} />,
                  strong: ({ ...props }) => <strong className="font-bold" {...props} />,
                  em: ({ ...props }) => <em className="italic" {...props} />,
                  code: ({ ...props }) => (
                    <code className="bg-zinc-700 px-2 py-0.5 rounded text-sm" {...props} />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote
                      className="border-l-4 border-zinc-600 pl-3 italic mb-2"
                      {...props}
                    />
                  ),
                  a: ({ ...props }) => (
                    <a className="text-blue-400 underline hover:text-blue-300" {...props} />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
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
