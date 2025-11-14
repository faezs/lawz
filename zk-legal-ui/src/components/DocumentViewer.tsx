import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { DocumentStatus } from '@/types';
import { zcashService } from '@/services/zcashService';
import { FileText, Shield, CheckCircle, Wallet, ArrowLeft } from 'lucide-react';

export function DocumentViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDocument, updateDocument, wallet } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lawFirmAddress] = useState('ztestsapling1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
  const [paymentAmount] = useState(0.1); // 0.1 ZEC fee

  const document = getDocument(id!);

  if (!document) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Document not found</p>
      </div>
    );
  }

  const handleSubmitDocument = async () => {
    setIsSubmitting(true);

    try {
      // Send payment via Zcash
      const memo = zcashService.createMemo(document.id, 'law_firm_1');
      const txId = await zcashService.sendPayment({
        amount: paymentAmount,
        recipient: lawFirmAddress,
        memo,
        documentId: document.id,
      });

      // Update document status
      updateDocument(document.id, {
        status: DocumentStatus.SUBMITTED,
        lawFirmAddress,
        paymentTxId: txId,
      });
    } catch (error) {
      console.error('Failed to submit document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>

      <div className="card">
        {/* Document Header */}
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-zk-primary" />
            <div>
              <h1 className="text-2xl font-bold text-white">Legal Document</h1>
              <p className="text-sm text-gray-400 font-mono">ID: {document.id}</p>
            </div>
          </div>
          <span className={`badge ${
            document.status === DocumentStatus.VERIFIED ? 'badge-success' :
            document.status === DocumentStatus.SUBMITTED ? 'badge-info' :
            'badge-warning'
          }`}>
            {document.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Document Details */}
        <div className="space-y-6">
          {/* ZK Proof Section */}
          {document.zkProof && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Zero-Knowledge Proof</h3>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Protocol:</span>
                  <span className="text-white font-mono">{document.zkProof.proof.protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Curve:</span>
                  <span className="text-white font-mono">{document.zkProof.proof.curve}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Public Signals:</span>
                  <span className="text-white font-mono">{document.zkProof.publicSignals.length}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-900 rounded font-mono text-xs text-gray-400 overflow-x-auto">
                <p>Proof Hash: {document.zkProof.proof.pi_a[0].slice(0, 32)}...</p>
              </div>
            </div>
          )}

          {/* Payment Section */}
          {document.status === DocumentStatus.PROOF_GENERATED && (
            <div className="bg-gradient-to-r from-zcash-orange/10 to-zcash-orange/5 border border-zcash-orange/30 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Wallet className="w-5 h-5 text-zcash-orange" />
                <h3 className="text-lg font-semibold text-white">Submit Document</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Law Firm Address:</p>
                  <p className="text-xs font-mono text-white bg-gray-900 p-3 rounded overflow-x-auto">
                    {lawFirmAddress}
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Payment Amount:</span>
                  <span className="text-2xl font-bold text-white">{paymentAmount} ZEC</span>
                </div>

                {wallet && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Your Balance:</span>
                    <span className="text-white">{wallet.balance.toFixed(4)} ZEC</span>
                  </div>
                )}

                <button
                  onClick={handleSubmitDocument}
                  disabled={isSubmitting || !wallet || wallet.balance < paymentAmount}
                  className="w-full btn-primary"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Document & Pay'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Payment will be sent via Zcash shielded transaction
                </p>
              </div>
            </div>
          )}

          {/* Submitted Info */}
          {document.paymentTxId && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Payment Confirmed</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Transaction ID:</p>
                  <p className="text-xs font-mono text-white bg-gray-900 p-3 rounded overflow-x-auto">
                    {document.paymentTxId}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Law Firm:</span>
                  <span className="text-white">Khan & Associates</span>
                </div>
              </div>
            </div>
          )}

          {/* Document Info */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Document Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{document.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span className="text-white">{new Date(document.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Encrypted:</span>
                <span className="text-white">Yes (AES-256)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
