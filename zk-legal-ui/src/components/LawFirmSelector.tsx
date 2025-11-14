import { useEffect, useState } from 'react';
import { aftokService } from '@/services/aftokService';
import { LawFirm } from '@/types';
import { Building, Star, MapPin, CheckCircle, Scale } from 'lucide-react';

export function LawFirmSelector() {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<LawFirm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLawFirms();
  }, []);

  const loadLawFirms = async () => {
    try {
      const firms = await aftokService.getLawFirms();
      setLawFirms(firms);
    } catch (error) {
      console.error('Failed to load law firms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Law Firms</h1>
        <p className="text-gray-400">
          Select a law firm to file your legal documents
        </p>
      </div>

      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-zk-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading law firms...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lawFirms.map((firm) => (
            <div
              key={firm.id}
              className={`card cursor-pointer transition-all ${
                selectedFirm?.id === firm.id
                  ? 'ring-2 ring-zk-primary'
                  : 'hover:border-gray-600'
              }`}
              onClick={() => setSelectedFirm(firm)}
            >
              {/* Law Firm Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-zk-primary/20 p-3 rounded-lg">
                    <Building className="w-6 h-6 text-zk-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{firm.name}</h3>
                    {firm.verified && (
                      <div className="flex items-center space-x-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{firm.address}</span>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-semibold">{firm.rating}</span>
                <span className="text-sm text-gray-400">/ 5.0</span>
              </div>

              {/* Specializations */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Specializations:</p>
                <div className="flex flex-wrap gap-2">
                  {firm.specializations.map((spec, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                    >
                      <Scale className="w-3 h-3 mr-1" />
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Zcash Address */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Zcash Address:</p>
                <p className="text-xs font-mono text-gray-400 truncate">
                  {firm.zcashAddress}
                </p>
              </div>

              {/* Aftok Integration Notice */}
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded p-2">
                <p className="text-xs text-green-300">
                  Revenue distributed via Aftok protocol
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Firm Details */}
      {selectedFirm && (
        <div className="card mt-8 bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/30">
          <h2 className="text-xl font-bold text-white mb-4">Selected Law Firm</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white mb-1">{selectedFirm.name}</p>
              <p className="text-gray-400">{selectedFirm.address}</p>
            </div>
            <button className="btn-primary">
              File Document
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 card bg-gradient-to-br from-blue-600/10 to-blue-800/10">
        <h3 className="text-lg font-semibold text-white mb-3">About Aftok Integration</h3>
        <p className="text-sm text-gray-400 mb-3">
          All law firms on this platform use the Aftok collaboration model. This means:
        </p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Fair revenue distribution based on time contributed</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Transparent payment allocation to all contributors</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Zcash payments settled directly on-chain</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span>Decentralized collaboration without corporate overhead</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
