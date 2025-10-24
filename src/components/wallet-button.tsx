'use client';

import { useDAppConnector } from './client-providers';

export function WalletButton() {
  const { dAppConnector, userAccountId, disconnect, refresh } = useDAppConnector() ?? {};

  const handleLogin = async () => {
    if (dAppConnector) {
      await dAppConnector.openModal();
      if (refresh) refresh();
    }
  };

  const handleDisconnect = () => {
    if (disconnect) {
      void disconnect();
    }
  };

  if (!userAccountId) {
    return (
      <button
        className="truncate px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
        onClick={handleLogin}
        disabled={!dAppConnector}
      >
        Wallet Connect
      </button>
    );
  }

  return (
    <button
      className="truncate px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
      onClick={handleDisconnect}
      disabled={!dAppConnector}
    >
      {`Disconnect (${userAccountId})`}
    </button>
  );
}
