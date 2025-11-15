import React from 'react';

interface CircuitNode {
  id: string;
  label: string;
  type: 'input' | 'operation' | 'output';
  private?: boolean;
}

interface CircuitEdge {
  from: string;
  to: string;
  label?: string;
}

interface CircuitDiagramProps {
  circuit: 'nadra-auth' | 'tax-calculation' | 'means-test';
}

export function CircuitDiagram({ circuit }: CircuitDiagramProps) {
  const getCircuitData = () => {
    switch (circuit) {
      case 'nadra-auth':
        return {
          title: 'NADRA Authentication Circuit',
          description: 'String diagram showing ZK proof flow for biometric authentication',
          nodes: [
            { id: 'cnic', label: 'CNIC Number', type: 'input', private: true },
            { id: 'fingerprint', label: 'Fingerprint Hash', type: 'input', private: true },
            { id: 'secret', label: 'Auth Secret', type: 'input', private: true },
            { id: 'timestamp', label: 'Timestamp', type: 'input', private: false },
            { id: 'challenge', label: 'Challenge', type: 'input', private: false },
            { id: 'validate', label: 'Validate CNIC Range', type: 'operation' },
            { id: 'hash1', label: 'Poseidon(CNIC, Fingerprint)', type: 'operation' },
            { id: 'hash2', label: 'Poseidon(Hash, Secret)', type: 'operation' },
            { id: 'hash3', label: 'Poseidon(Hash, Challenge, Time)', type: 'operation' },
            { id: 'token', label: 'Auth Token', type: 'output', private: false },
            { id: 'valid', label: 'Is Valid', type: 'output', private: false },
          ] as CircuitNode[],
          edges: [
            { from: 'cnic', to: 'validate', label: 'check range' },
            { from: 'cnic', to: 'hash1', label: 'input[0]' },
            { from: 'fingerprint', to: 'hash1', label: 'input[1]' },
            { from: 'hash1', to: 'hash2', label: 'input[0]' },
            { from: 'secret', to: 'hash2', label: 'input[1]' },
            { from: 'hash2', to: 'hash3', label: 'input[0]' },
            { from: 'challenge', to: 'hash3', label: 'input[1]' },
            { from: 'timestamp', to: 'hash3', label: 'input[2]' },
            { from: 'hash3', to: 'token' },
            { from: 'validate', to: 'valid' },
          ] as CircuitEdge[],
        };
      case 'tax-calculation':
        return {
          title: 'Tax Calculation Circuit',
          description: 'Proves correct tax calculation without revealing income',
          nodes: [
            { id: 'income', label: 'Income', type: 'input', private: true },
            { id: 'deductions', label: 'Deductions', type: 'input', private: true },
            { id: 'dependents', label: 'Dependents', type: 'input', private: true },
            { id: 'subtract', label: 'Income - Deductions', type: 'operation' },
            { id: 'brackets', label: 'Apply Tax Brackets', type: 'operation' },
            { id: 'credits', label: 'Dependent Credits', type: 'operation' },
            { id: 'taxOwed', label: 'Tax Owed', type: 'output', private: false },
            { id: 'bracket', label: 'Tax Bracket', type: 'output', private: false },
          ] as CircuitNode[],
          edges: [
            { from: 'income', to: 'subtract' },
            { from: 'deductions', to: 'subtract' },
            { from: 'subtract', to: 'brackets' },
            { from: 'brackets', to: 'credits' },
            { from: 'dependents', to: 'credits' },
            { from: 'credits', to: 'taxOwed' },
            { from: 'brackets', to: 'bracket' },
          ] as CircuitEdge[],
        };
      case 'means-test':
        return {
          title: 'Means Test Circuit',
          description: 'Proves financial eligibility without revealing exact amounts',
          nodes: [
            { id: 'income', label: 'Monthly Income', type: 'input', private: true },
            { id: 'expenses', label: 'Monthly Expenses', type: 'input', private: true },
            { id: 'assets', label: 'Total Assets', type: 'input', private: true },
            { id: 'liabilities', label: 'Total Liabilities', type: 'input', private: true },
            { id: 'disposable', label: 'Income - Expenses', type: 'operation' },
            { id: 'netWorth', label: 'Assets - Liabilities', type: 'operation' },
            { id: 'compare', label: 'Compare to Threshold', type: 'operation' },
            { id: 'eligible', label: 'Is Eligible', type: 'output', private: false },
          ] as CircuitNode[],
          edges: [
            { from: 'income', to: 'disposable' },
            { from: 'expenses', to: 'disposable' },
            { from: 'assets', to: 'netWorth' },
            { from: 'liabilities', to: 'netWorth' },
            { from: 'disposable', to: 'compare' },
            { from: 'netWorth', to: 'compare' },
            { from: 'compare', to: 'eligible' },
          ] as CircuitEdge[],
        };
    }
  };

  const data = getCircuitData();

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-purple-500/30">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">{data.title}</h3>
        <p className="text-sm text-gray-400">{data.description}</p>
      </div>

      {/* String Diagram Visualization */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-auto"
          style={{ minHeight: '400px' }}
        >
          <defs>
            {/* Arrow marker */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" />
            </marker>

            {/* Glow filter for private inputs */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Render nodes */}
          {data.nodes.map((node, idx) => {
            const x = node.type === 'input' ? 100 : node.type === 'output' ? 700 : 400;
            const y = 50 + idx * 60;

            return (
              <g key={node.id}>
                {/* Node box */}
                <rect
                  x={x - 80}
                  y={y - 20}
                  width="160"
                  height="40"
                  rx="8"
                  fill={
                    node.type === 'input'
                      ? node.private
                        ? '#7C3AED'
                        : '#3B82F6'
                      : node.type === 'output'
                      ? '#10B981'
                      : '#6B7280'
                  }
                  stroke={node.private ? '#A78BFA' : '#6B7280'}
                  strokeWidth="2"
                  filter={node.private ? 'url(#glow)' : 'none'}
                />

                {/* Node label */}
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="600"
                >
                  {node.label}
                </text>

                {/* Private/Public indicator */}
                {node.type === 'input' && (
                  <text
                    x={x}
                    y={y + 35}
                    textAnchor="middle"
                    fill={node.private ? '#F59E0B' : '#10B981'}
                    fontSize="9"
                    fontWeight="500"
                  >
                    {node.private ? '🔒 PRIVATE' : '🌐 PUBLIC'}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render edges (simplified - just showing connections) */}
          {data.edges.map((edge, idx) => {
            const fromNode = data.nodes.find((n) => n.id === edge.from);
            const toNode = data.nodes.find((n) => n.id === edge.to);

            if (!fromNode || !toNode) return null;

            const fromIdx = data.nodes.indexOf(fromNode);
            const toIdx = data.nodes.indexOf(toNode);

            const x1 = fromNode.type === 'input' ? 100 : fromNode.type === 'output' ? 700 : 400;
            const y1 = 50 + fromIdx * 60;
            const x2 = toNode.type === 'input' ? 100 : toNode.type === 'output' ? 700 : 400;
            const y2 = 50 + toIdx * 60;

            // Create curved path
            const midX = (x1 + x2) / 2;
            const path = `M ${x1 + 80} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2 - 80} ${y2}`;

            return (
              <g key={`${edge.from}-${edge.to}-${idx}`}>
                <path
                  d={path}
                  stroke="#8B5CF6"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  opacity="0.6"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={(y1 + y2) / 2 - 5}
                    textAnchor="middle"
                    fill="#A78BFA"
                    fontSize="10"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(50, 550)">
            <text fill="#9CA3AF" fontSize="11" fontWeight="600">
              Legend:
            </text>
            <circle cx="50" cy="-2" r="5" fill="#7C3AED" filter="url(#glow)" />
            <text x="60" y="2" fill="#D1D5DB" fontSize="10">
              Private Input
            </text>
            <circle cx="150" cy="-2" r="5" fill="#3B82F6" />
            <text x="160" y="2" fill="#D1D5DB" fontSize="10">
              Public Input
            </text>
            <circle cx="250" cy="-2" r="5" fill="#6B7280" />
            <text x="260" y="2" fill="#D1D5DB" fontSize="10">
              Operation
            </text>
            <circle cx="340" cy="-2" r="5" fill="#10B981" />
            <text x="350" y="2" fill="#D1D5DB" fontSize="10">
              Public Output
            </text>
          </g>
        </svg>
      </div>

      {/* ZK Guarantee */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
        <p className="text-xs text-purple-300">
          <span className="font-semibold">Zero-Knowledge Guarantee:</span> Private inputs are
          never revealed. Only public outputs and the proof of correct computation are shared.
        </p>
      </div>
    </div>
  );
}
