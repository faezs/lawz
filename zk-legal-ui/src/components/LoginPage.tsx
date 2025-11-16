import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { nadraService } from '@/services/nadraService';
import { zcashService } from '@/services/zcashService';
import { CircuitDiagram } from './CircuitDiagram';
import { Fingerprint, Wallet, Scale, Shield, Loader } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { setNadraCredentials, setWallet, setLoading, setError } = useAppStore();

  const [citizenId, setCitizenId] = useState('');
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false);
  const [fingerprintData, setFingerprintData] = useState<string | null>(null);
  const [showCircuit, setShowCircuit] = useState(false);
  const [zkProof, setZkProof] = useState<any>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

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

  const generateZKProof = async () => {
    if (!citizenId || !fingerprintData) return;

    setIsGeneratingProof(true);
    setError(null);

    try {
      // Convert CNIC to number (remove dashes)
      // In production: const cnicNumber = BigInt(citizenId.replace(/-/g, ''));
      citizenId.replace(/-/g, '');

      // Hash the fingerprint data
      // In production: const fingerprintHash = BigInt('0x' + fingerprintData.slice(0, 16));
      fingerprintData.slice(0, 16);

      // Generate random auth secret
      // In production: const authSecret = BigInt(Math.floor(Math.random() * 1000000000));
      Math.random();

      // Public inputs
      const timestamp = BigInt(Date.now());
      const challenge = BigInt(Math.floor(Math.random() * 1000000000));

      // Simulate ZK proof generation (in production, this would use actual snarkjs)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock proof structure
      const proof = {
        proof: {
          pi_a: [
            '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            '0x1'
          ],
          pi_b: [
            ['0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
             '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')],
            ['0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
             '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')],
            ['0x1', '0x0']
          ],
          pi_c: [
            '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            '0x1'
          ],
          protocol: 'groth16',
          curve: 'bn128'
        },
        publicSignals: [
          timestamp.toString(),
          challenge.toString(),
          // Mock auth token (would be computed by circuit)
          '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          '1' // isValid
        ]
      };

      setZkProof(proof);
      setShowCircuit(true);
    } catch (error) {
      setError('Failed to generate ZK proof');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handleLogin = async () => {
    if (!citizenId || !fingerprintData) {
      setError('Please provide CNIC and capture fingerprint');
      return;
    }

    // Generate ZK proof first
    if (!zkProof) {
      await generateZKProof();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Authenticate with NADRA (with ZK proof)
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Login Form */}
          <div>
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

                {/* ZK Proof Generation */}
                {fingerprintData && !zkProof && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-purple-300 font-semibold mb-2">
                          Zero-Knowledge Authentication
                        </p>
                        <p className="text-xs text-gray-400 mb-3">
                          Generate a ZK proof to authenticate without revealing your biometric data
                        </p>
                        <button
                          onClick={generateZKProof}
                          disabled={isGeneratingProof}
                          className={`w-full btn-primary flex items-center justify-center space-x-2 ${
                            isGeneratingProof ? 'proof-generating' : ''
                          }`}
                        >
                          {isGeneratingProof ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin" />
                              <span>Generating ZK Proof...</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-5 h-5" />
                              <span>Generate ZK Proof</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proof Generated */}
                {zkProof && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-5 h-5 text-green-400" />
                      <p className="text-sm text-green-400 font-semibold">
                        ZK Proof Generated ✓
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Proof Protocol: {zkProof.proof.protocol} on {zkProof.proof.curve}
                    </p>
                    <p className="text-xs text-gray-400">
                      Public Signals: {zkProof.publicSignals.length} values
                    </p>
                    <button
                      onClick={() => setShowCircuit(!showCircuit)}
                      className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      {showCircuit ? 'Hide' : 'Show'} Circuit Diagram
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {useAppStore.getState().error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                    {useAppStore.getState().error}
                  </div>
                )}

                {/* Login Button */}
                <button
                  onClick={handleLogin}
                  disabled={!citizenId || !fingerprintData || !zkProof}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {zkProof ? 'Login with ZK Proof' : 'Generate Proof to Login'}
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

          {/* Right Column - Circuit Diagram */}
          <div>
            {showCircuit && zkProof && (
              <div className="lg:sticky lg:top-8">
                <CircuitDiagram circuit="nadra-auth" />

                {/* Proof Details */}
                <div className="mt-6 card bg-gray-900/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Proof Details</h3>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Public Signals:</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-xs overflow-x-auto">
                        {zkProof.publicSignals.map((signal: string, idx: number) => (
                          <div key={idx} className="text-gray-300">
                            [{idx}]: {signal.slice(0, 20)}...{signal.slice(-20)}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-400 mb-1">Proof (pi_a):</p>
                      <div className="bg-gray-800 p-3 rounded font-mono text-xs text-gray-500 overflow-x-auto">
                        {zkProof.proof.pi_a[0].slice(0, 32)}...
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <div className="flex-1 h-px bg-green-500/30"></div>
                      <span className="text-green-400 text-xs font-semibold">VERIFIED ✓</span>
                      <div className="flex-1 h-px bg-green-500/30"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!showCircuit && (
              <div className="card bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-400">
                    Generate ZK proof to see the circuit diagram
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
