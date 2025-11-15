import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { nadraService } from '@/services/nadraService';
import { zcashService } from '@/services/zcashService';
import { Scale, Wallet, LogOut } from 'lucide-react';

export function Header() {
  const { wallet, nadraCredentials, setNadraCredentials, setWallet } = useAppStore();

  const handleLogout = () => {
    nadraService.logout();
    zcashService.disconnect();
    setNadraCredentials(null);
    setWallet(null);
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <Scale className="w-8 h-8 text-zk-primary" />
            <div>
              <h1 className="text-xl font-bold text-white">ZK Legal System</h1>
              <p className="text-xs text-gray-400">Zero-Knowledge Legal Document Filing</p>
            </div>
          </Link>

          <nav className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/create"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Create Document
            </Link>
            <Link
              to="/lawfirms"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Law Firms
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            {wallet && (
              <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
                <Wallet className="w-4 h-4 text-zcash-orange" />
                <div className="text-sm">
                  <div className="text-gray-400">Balance</div>
                  <div className="text-white font-semibold">{wallet.balance.toFixed(4)} ZEC</div>
                </div>
              </div>
            )}

            {nadraCredentials && (
              <div className="text-sm text-gray-400">
                CNIC: {nadraCredentials.citizenId}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
