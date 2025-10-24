import { WalletButton } from '@/components/wallet-button';

export function Navbar() {
  return (
    <nav className="w-full bg-gray-900 border-b border-gray-700">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-white">
            MAS Polymarket on Hedera
          </h1>
        </div>

        <div className="flex items-center">
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
