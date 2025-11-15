import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { nadraService } from '@/services/nadraService';
import { zcashService } from '@/services/zcashService';
import { Fingerprint, Wallet, Scale, Shield } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { setNadraCredentials, setWallet, setLoading, setError } = useAppStore();

  const [citizenId, setCitizenId] = useState('');
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false);
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);

  const handleCaptureFingerprint = async () => {
    setIsCapturingFingerprint(true);
    setError(null);

    try {
      const fingerprint = await nadraService.captureFingerprintMock();
      setFingerprintData(fingerprint);
    } catch (error) {
      setError('Failed to capture fingerprint');
    } finally {
      setIsCapturingFingerprint(false);
    }
  };

  const handleLogin = async () => {
    if (!citizenId || !fingerprintData) {
      setError('Please provide CNIC and capture fingerprint');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Authenticate with NADRA
      const credentials = await nadraService.authenticateFingerprint(
        citizenId,
        fingerprintData
      );
      setNadraCredentials(credentials);

      // Initialize Zashi wallet
      const wallet = await zcashService.initializeWallet();
      setWallet(wallet);

      // Navigate to dashboard
      navigate('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-zk-primary/20 p-6 rounded-full">
              <Scale className="w-16 h-16 text-zk-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            ZK Legal System
          </h1>
          <p className="text-gray-400">
            Zero-Knowledge Legal Document Filing with Zcash Settlement
          </p>

          <div className="flex justify-center space-x-6 mt-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-zk-secondary" />
              <span className="text-sm text-gray-400">ZK Proofs</span>
            </div>
            <div className="flex items-center space-x-2">
              <Fingerprint className="w-5 h-5 text-zk-secondary" />
              <span className="text-sm text-gray-400">NADRA Auth</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-zk-secondary" />
              <span className="text-sm text-gray-400">Zcash</span>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-6">Login</h2>

          <div className="space-y-4">
            {/* CNIC Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CNIC Number
              </label>
              <input
                type="text"
                placeholder="XXXXX-XXXXXXX-X"
                value={citizenId}
                onChange={(e) => setCitizenId(e.target.value)}
                className="input-field"
                maxLength={15}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: 12345-1234567-1
              </p>
            </div>

            {/* Fingerprint Capture */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fingerprint Authentication
              </label>
              <button
                onClick={handleCaptureFingerprint}
                disabled={isCapturingFingerprint}
                className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                <Fingerprint className="w-5 h-5" />
                <span>
                  {isCapturingFingerprint
                    ? 'Capturing...'
                    : fingerprintData
                    ? 'Fingerprint Captured ✓'
                    : 'Capture Fingerprint'}
                </span>
              </button>
              {fingerprintData && (
                <p className="text-xs text-green-400 mt-1">
                  Fingerprint captured successfully
                </p>
              )}
            </div>

            {/* Error Message */}
            {useAppStore.getState().error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                {useAppStore.getState().error}
              </div>
            )}

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={!citizenId || !fingerprintData}
              className="w-full btn-primary disabled:opacity-50"
            >
              Login with NADRA
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Hackathon Demo:</strong> This uses mock NADRA authentication
              and Zcash testnet. In production, it would integrate with actual
              NADRA APIs and mainnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
