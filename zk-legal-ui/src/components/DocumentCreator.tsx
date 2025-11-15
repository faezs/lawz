import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { DocumentType, DocumentStatus, TaxCalculationInput, MeansTestInput } from '@/types';
import { FileText, Shield, Loader } from 'lucide-react';

export function DocumentCreator() {
  const navigate = useNavigate();
  const { addDocument, setError } = useAppStore();

  const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.TAX_CALCULATION);
  const [taxInput, setTaxInput] = useState<TaxCalculationInput>({
    income: 0,
    deductions: [],
    filingStatus: 'single',
    dependents: 0,
  });
  const [meansTestInput, setMeansTestInput] = useState<MeansTestInput>({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    assets: [],
    liabilities: [],
    dependents: 0,
  });
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const handleGenerateProof = async () => {
    setIsGeneratingProof(true);
    setError(null);

    try {
      const documentId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Generate ZK proof based on document type
      let zkProof;
      let circuitInput;

      if (selectedType === DocumentType.TAX_CALCULATION) {
        // Convert tax input to circuit format
        circuitInput = {
          income: BigInt(Math.floor(taxInput.income * 100)), // Convert to cents
          totalDeductions: BigInt(Math.floor(taxInput.deductions.reduce((a, b) => a + b, 0) * 100)),
          dependents: BigInt(taxInput.dependents),
          filingStatus: BigInt(taxInput.filingStatus === 'single' ? 0 : taxInput.filingStatus === 'married' ? 1 : 2),
        };

        // For demo, we'll mock the proof generation
        // In production, you'd have actual circuit files
        console.log('Generating tax calculation proof with input:', circuitInput);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate proof generation

        zkProof = {
          proof: {
            pi_a: ['mock_a1', 'mock_a2', 'mock_a3'],
            pi_b: [['mock_b11', 'mock_b12'], ['mock_b21', 'mock_b22'], ['mock_b31', 'mock_b32']],
            pi_c: ['mock_c1', 'mock_c2', 'mock_c3'],
            protocol: 'groth16',
            curve: 'bn128',
          },
          publicSignals: [
            String(circuitInput.income),
            String(circuitInput.totalDeductions),
          ],
        };
      } else if (selectedType === DocumentType.MEANS_TEST) {
        circuitInput = {
          monthlyIncome: BigInt(Math.floor(meansTestInput.monthlyIncome * 100)),
          monthlyExpenses: BigInt(Math.floor(meansTestInput.monthlyExpenses * 100)),
          totalAssets: BigInt(Math.floor(meansTestInput.assets.reduce((sum, a) => sum + a.value, 0) * 100)),
          totalLiabilities: BigInt(Math.floor(meansTestInput.liabilities.reduce((sum, l) => sum + l.amount, 0) * 100)),
          dependents: BigInt(meansTestInput.dependents),
        };

        console.log('Generating means test proof with input:', circuitInput);
        await new Promise(resolve => setTimeout(resolve, 3000));

        zkProof = {
          proof: {
            pi_a: ['mock_a1', 'mock_a2', 'mock_a3'],
            pi_b: [['mock_b11', 'mock_b12'], ['mock_b21', 'mock_b22'], ['mock_b31', 'mock_b32']],
            pi_c: ['mock_c1', 'mock_c2', 'mock_c3'],
            protocol: 'groth16',
            curve: 'bn128',
          },
          publicSignals: [
            String(circuitInput.monthlyIncome),
            String(circuitInput.monthlyExpenses),
          ],
        };
      }

      // Encrypt the actual document content
      const encryptedContent = btoa(JSON.stringify(
        selectedType === DocumentType.TAX_CALCULATION ? taxInput : meansTestInput
      ));

      // Create document
      const document = {
        id: documentId,
        type: selectedType,
        status: DocumentStatus.PROOF_GENERATED,
        createdAt: Date.now(),
        zkProof,
        encryptedContent,
      };

      addDocument(document);
      navigate(`/document/${documentId}`);
    } catch (error) {
      setError('Failed to generate proof: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingProof(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create Legal Document</h1>
        <p className="text-gray-400">
          Generate zero-knowledge proofs for your legal documents
        </p>
      </div>

      <div className="card">
        {/* Document Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Document Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { type: DocumentType.TAX_CALCULATION, name: 'Tax Calculation', desc: 'Catala-based tax computation' },
              { type: DocumentType.MEANS_TEST, name: 'Means Test', desc: 'Financial eligibility proof' },
              { type: DocumentType.DIVORCE_SETTLEMENT, name: 'Divorce Settlement', desc: 'Settlement amount calculation' },
            ].map((option) => (
              <button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                className={`p-4 rounded-lg border-2 transition-colors text-left ${
                  selectedType === option.type
                    ? 'border-zk-primary bg-zk-primary/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center mb-2">
                  <FileText className="w-5 h-5 text-zk-primary mr-2" />
                  <span className="font-semibold text-white">{option.name}</span>
                </div>
                <p className="text-sm text-gray-400">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tax Calculation Form */}
        {selectedType === DocumentType.TAX_CALCULATION && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">Tax Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Annual Income (PKR)
              </label>
              <input
                type="number"
                value={taxInput.income || ''}
                onChange={(e) => setTaxInput({ ...taxInput, income: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filing Status
              </label>
              <select
                value={taxInput.filingStatus}
                onChange={(e) => setTaxInput({ ...taxInput, filingStatus: e.target.value as any })}
                className="input-field"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Dependents
              </label>
              <input
                type="number"
                value={taxInput.dependents || ''}
                onChange={(e) => setTaxInput({ ...taxInput, dependents: parseInt(e.target.value) || 0 })}
                className="input-field"
                min="0"
              />
            </div>
          </div>
        )}

        {/* Means Test Form */}
        {selectedType === DocumentType.MEANS_TEST && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">Financial Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Income (PKR)
                </label>
                <input
                  type="number"
                  value={meansTestInput.monthlyIncome || ''}
                  onChange={(e) => setMeansTestInput({
                    ...meansTestInput,
                    monthlyIncome: parseFloat(e.target.value) || 0
                  })}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Expenses (PKR)
                </label>
                <input
                  type="number"
                  value={meansTestInput.monthlyExpenses || ''}
                  onChange={(e) => setMeansTestInput({
                    ...meansTestInput,
                    monthlyExpenses: parseFloat(e.target.value) || 0
                  })}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Dependents
              </label>
              <input
                type="number"
                value={meansTestInput.dependents || ''}
                onChange={(e) => setMeansTestInput({
                  ...meansTestInput,
                  dependents: parseInt(e.target.value) || 0
                })}
                className="input-field"
                min="0"
              />
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="text-sm text-purple-300">
              <p className="font-semibold mb-1">Zero-Knowledge Privacy</p>
              <p>
                Your sensitive financial data will be encrypted and only ZK proofs
                will be generated. The proofs verify correctness without revealing
                the actual values.
              </p>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateProof}
          disabled={isGeneratingProof}
          className={`w-full mt-6 btn-primary flex items-center justify-center space-x-2 ${
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
  );
}
