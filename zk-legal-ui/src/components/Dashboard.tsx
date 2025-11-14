import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { DocumentType, DocumentStatus } from '@/types';
import { FileText, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const documents = useAppStore((state) => state.documents);

  const getStatusBadge = (status: DocumentStatus) => {
    const badges = {
      [DocumentStatus.DRAFT]: { class: 'badge-warning', icon: Clock },
      [DocumentStatus.PROOF_GENERATING]: { class: 'badge-info', icon: Clock },
      [DocumentStatus.PROOF_GENERATED]: { class: 'badge-info', icon: CheckCircle },
      [DocumentStatus.PAYMENT_PENDING]: { class: 'badge-warning', icon: Clock },
      [DocumentStatus.SUBMITTED]: { class: 'badge-success', icon: CheckCircle },
      [DocumentStatus.VERIFIED]: { class: 'badge-success', icon: CheckCircle },
      [DocumentStatus.REJECTED]: { class: 'badge-error', icon: AlertCircle },
    };

    const config = badges[status];
    const Icon = config.icon;

    return (
      <span className={config.class}>
        <Icon className="w-4 h-4 mr-1" />
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getDocumentTypeName = (type: DocumentType) => {
    const names = {
      [DocumentType.TAX_CALCULATION]: 'Tax Calculation',
      [DocumentType.MEANS_TEST]: 'Means Test',
      [DocumentType.DIVORCE_SETTLEMENT]: 'Divorce Settlement',
      [DocumentType.FINANCIAL_DISCLOSURE]: 'Financial Disclosure',
      [DocumentType.PROPERTY_TRANSFER]: 'Property Transfer',
      [DocumentType.CUSTOM]: 'Custom Document',
    };
    return names[type];
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Manage your zero-knowledge legal documents
          </p>
        </div>
        <Link to="/create" className="btn-primary flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>New Document</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Documents</p>
              <p className="text-3xl font-bold text-white">{documents.length}</p>
            </div>
            <FileText className="w-10 h-10 text-purple-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Verified</p>
              <p className="text-3xl font-bold text-white">
                {documents.filter(d => d.status === DocumentStatus.VERIFIED).length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-3xl font-bold text-white">
                {documents.filter(d =>
                  [DocumentStatus.DRAFT, DocumentStatus.PAYMENT_PENDING].includes(d.status)
                ).length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">With ZK Proofs</p>
              <p className="text-3xl font-bold text-white">
                {documents.filter(d => d.zkProof).length}
              </p>
            </div>
            <FileText className="w-10 h-10 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Recent Documents</h2>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No documents yet</p>
            <Link to="/create" className="btn-primary inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Create Your First Document</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                to={`/document/${doc.id}`}
                className="block bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-5 h-5 text-zk-primary" />
                      <h3 className="text-lg font-semibold text-white">
                        {getDocumentTypeName(doc.type)}
                      </h3>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="text-sm text-gray-400">
                      <span>Created: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      {doc.zkProof && (
                        <span className="ml-4">✓ ZK Proof Generated</span>
                      )}
                      {doc.paymentTxId && (
                        <span className="ml-4">✓ Payment Confirmed</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Document ID</p>
                    <p className="text-xs font-mono text-gray-500">
                      {doc.id.slice(0, 8)}...{doc.id.slice(-8)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-gradient-to-br from-purple-600/10 to-purple-800/10">
          <h3 className="text-lg font-semibold text-white mb-2">
            How ZK Legal Works
          </h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Create legal documents with sensitive data</li>
            <li>• Generate zero-knowledge proofs for verification</li>
            <li>• Pay law firms privately via Zcash</li>
            <li>• Submit documents without revealing details</li>
          </ul>
        </div>

        <div className="card bg-gradient-to-br from-green-600/10 to-green-800/10">
          <h3 className="text-lg font-semibold text-white mb-2">
            Powered By Aftok
          </h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Fair revenue distribution to law firms</li>
            <li>• Time-based contribution tracking</li>
            <li>• Transparent payment allocation</li>
            <li>• Decentralized collaboration model</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
