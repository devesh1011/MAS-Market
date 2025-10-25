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
        className="truncate bg-zinc-900 border border-zinc-800 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
        onClick={handleLogin}
        disabled={!dAppConnector}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <button
      className="truncate bg-zinc-900 border border-zinc-800 text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
      onClick={handleDisconnect}
      disabled={!dAppConnector}
    >
      {userAccountId}
    </button>
  );
}
