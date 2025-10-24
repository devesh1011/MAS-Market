type EmptyChatProps = {
  isChatEmpty: boolean;
};

export function EmptyChat({ isChatEmpty }: EmptyChatProps) {
  return (
    <div>
      {isChatEmpty && (
        <div className="flex items-center justify-center h-full opacity-60">
          <p className="text-gray-300 text-center px-6 py-4 rounded-lg bg-gray-800 border border-gray-600 shadow-lg">
            No messages, ask the chat about something e.g. your HBAR balance
          </p>
        </div>
      )}
    </div>
  );
}
