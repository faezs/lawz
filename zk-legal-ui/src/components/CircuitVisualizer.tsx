import React, { useEffect, useRef, useState } from 'react';
import {
  parseCircuitFromFile,
  parseCircuitFromSource,
  CircuitCospan,
  CircuitExporter,
} from '@/services/circuitParser';

/**
 * Circuit Visualizer Component
 *
 * Displays circom circuit structure as an interactive graph cospan:
 * - Nodes: Signals (inputs, outputs, intermediates) and Components
 * - Edges: Data flow, constraints, and component I/O
 * - Interactive: Pan, zoom, click nodes for details
 */

interface CircuitVisualizerProps {
  circuitPath?: string;
  circuitSource?: string;
  circuitName: string;
  onNodeClick?: (nodeId: string) => void;
}

export const CircuitVisualizer: React.FC<CircuitVisualizerProps> = ({
  circuitPath,
  circuitSource,
  circuitName,
  onNodeClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cospan, setCospan] = useState<CircuitCospan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showStats, setShowStats] = useState(true);
  const [exportFormat, setExportFormat] = useState<'dot' | 'json' | 'mermaid'>('json');

  useEffect(() => {
    loadCircuit();
  }, [circuitPath, circuitSource]);

  useEffect(() => {
    if (cospan && containerRef.current && typeof window !== 'undefined') {
      renderGraph(cospan);
    }
  }, [cospan]);

  const loadCircuit = async () => {
    try {
      setLoading(true);
      setError(null);

      let parsedCospan: CircuitCospan;

      if (circuitSource) {
        parsedCospan = parseCircuitFromSource(circuitSource);
      } else if (circuitPath) {
        parsedCospan = await parseCircuitFromFile(circuitPath);
      } else {
        throw new Error('Either circuitPath or circuitSource must be provided');
      }

      setCospan(parsedCospan);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load circuit:', err);
      setError(`Failed to load circuit: ${err}`);
      setLoading(false);
    }
  };

  const renderGraph = async (cospan: CircuitCospan) => {
    if (!containerRef.current) return;

    // For now, render using SVG manually
    // In production, use cytoscape.js or D3.js
    // We'll use a simple force-directed layout

    const nodes = cospan.nodes;
    const edges = cospan.edges;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '600');
    svg.setAttribute('viewBox', '0 0 1000 600');
    svg.style.border = '1px solid #ccc';
    svg.style.borderRadius = '8px';
    svg.style.background = '#fafafa';

    // Simple layout: distribute nodes in layers based on type
    const inputNodes = nodes.filter(n =>
      n.type === 'signal' && cospan.signals.find(s => s.name === n.id && s.type === 'input')
    );
    const outputNodes = nodes.filter(n =>
      n.type === 'signal' && cospan.signals.find(s => s.name === n.id && s.type === 'output')
    );
    const componentNodes = nodes.filter(n => n.type === 'component');
    const intermediateNodes = nodes.filter(n =>
      n.type === 'signal' &&
      !inputNodes.includes(n) &&
      !outputNodes.includes(n)
    );

    const layers = [inputNodes, componentNodes, intermediateNodes, outputNodes];
    const nodePositions = new Map<string, { x: number; y: number }>();

    // Layout nodes in columns
    layers.forEach((layer, layerIdx) => {
      const x = 100 + layerIdx * 250;
      const yStep = 600 / (layer.length + 1);

      layer.forEach((node, nodeIdx) => {
        const y = yStep * (nodeIdx + 1);
        nodePositions.set(node.id, { x, y });
        node.position = { x, y };
      });
    });

    // Draw edges
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('id', 'edges');

    for (const edge of edges) {
      const fromPos = nodePositions.get(edge.from);
      const toPos = nodePositions.get(edge.to);

      if (!fromPos || !toPos) continue;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromPos.x.toString());
      line.setAttribute('y1', fromPos.y.toString());
      line.setAttribute('x2', toPos.x.toString());
      line.setAttribute('y2', toPos.y.toString());
      line.setAttribute('stroke', edge.type === 'constraint' ? '#ff6b6b' : '#4dabf7');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', edge.type === 'constraint' ? '5,5' : '0');
      line.setAttribute('marker-end', 'url(#arrowhead)');

      edgeGroup.appendChild(line);

      // Add label if present
      if (edge.label) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        text.setAttribute('x', midX.toString());
        text.setAttribute('y', (midY - 5).toString());
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', '#666');
        text.textContent = edge.label;
        edgeGroup.appendChild(text);
      }
    }

    svg.appendChild(edgeGroup);

    // Define arrow marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.setAttribute('fill', '#4dabf7');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.insertBefore(defs, svg.firstChild);

    // Draw nodes
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('id', 'nodes');

    for (const node of nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'node');
      group.setAttribute('data-id', node.id);
      group.style.cursor = 'pointer';

      // Node shape
      const shape = node.type === 'signal'
        ? document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
        : document.createElementNS('http://www.w3.org/2000/svg', 'rect');

      if (node.type === 'signal') {
        shape.setAttribute('cx', pos.x.toString());
        shape.setAttribute('cy', pos.y.toString());
        shape.setAttribute('rx', '50');
        shape.setAttribute('ry', '25');
      } else {
        shape.setAttribute('x', (pos.x - 50).toString());
        shape.setAttribute('y', (pos.y - 25).toString());
        shape.setAttribute('width', '100');
        shape.setAttribute('height', '50');
        shape.setAttribute('rx', '5');
      }

      // Color based on type
      const signal = cospan.signals.find(s => s.name === node.id);
      let fill = '#e9ecef';

      if (node.type === 'signal') {
        if (signal?.type === 'input') fill = '#51cf66';
        else if (signal?.type === 'output') fill = '#ff6b6b';
        else fill = '#ffd43b';
      } else {
        fill = '#74c0fc';
      }

      shape.setAttribute('fill', fill);
      shape.setAttribute('stroke', '#495057');
      shape.setAttribute('stroke-width', '2');

      group.appendChild(shape);

      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x.toString());
      text.setAttribute('y', (pos.y + 5).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#000');
      text.textContent = node.id.length > 10 ? node.id.substring(0, 10) + '...' : node.id;

      group.appendChild(text);

      // Click handler
      group.addEventListener('click', () => {
        setSelectedNode(node);
        if (onNodeClick) {
          onNodeClick(node.id);
        }
      });

      nodeGroup.appendChild(group);
    }

    svg.appendChild(nodeGroup);

    // Clear and append
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(svg);
  };

  const handleExport = () => {
    if (!cospan) return;

    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    switch (exportFormat) {
      case 'dot':
        content = CircuitExporter.toDOT(cospan);
        filename = `${circuitName}.dot`;
        mimeType = 'text/vnd.graphviz';
        break;
      case 'json':
        content = CircuitExporter.toJSON(cospan);
        filename = `${circuitName}.json`;
        mimeType = 'application/json';
        break;
      case 'mermaid':
        content = CircuitExporter.toMermaid(cospan);
        filename = `${circuitName}.mmd`;
        mimeType = 'text/plain';
        break;
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading circuit...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!cospan) {
    return <div>No circuit loaded</div>;
  }

  return (
    <div className="circuit-visualizer space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{cospan.name}</h2>
          <p className="text-sm text-gray-600">Version: {cospan.version}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {showStats ? 'Hide' : 'Show'} Statistics
          </button>

          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="px-3 py-2 border rounded"
          >
            <option value="json">JSON</option>
            <option value="dot">DOT (Graphviz)</option>
            <option value="mermaid">Mermaid</option>
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded border">
          <div>
            <div className="text-sm text-gray-600">Total Signals</div>
            <div className="text-2xl font-bold">{cospan.stats.totalSignals}</div>
            <div className="text-xs text-gray-500">
              {cospan.stats.publicSignals} public, {cospan.stats.privateSignals} private
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Components</div>
            <div className="text-2xl font-bold">{cospan.stats.totalComponents}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Constraints</div>
            <div className="text-2xl font-bold">{cospan.stats.totalConstraints}</div>
            <div className="text-xs text-gray-500">Max depth: {cospan.stats.maxDepth}</div>
          </div>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="border rounded-lg overflow-hidden">
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Legend */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded border text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-gray-700"></div>
          <span>Input Signal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-400 border-2 border-gray-700"></div>
          <span>Output Signal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-300 border-2 border-gray-700"></div>
          <span>Intermediate Signal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-300 border-2 border-gray-700"></div>
          <span>Component</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-400"></div>
          <span>Data Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-red-400" style={{ borderTop: '2px dashed' }}></div>
          <span>Constraint</span>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="p-4 bg-white border rounded shadow">
          <h3 className="font-bold text-lg mb-2">Node Details: {selectedNode.id}</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold">Type:</span> {selectedNode.type}
            </div>
            <div>
              <span className="font-semibold">Label:</span> {selectedNode.label}
            </div>
            {Object.entries(selectedNode.properties).map(([key, value]) => (
              <div key={key}>
                <span className="font-semibold capitalize">{key}:</span>{' '}
                {JSON.stringify(value)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cospan Structure Information */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold mb-2">Graph Cospan Structure</h3>
        <div className="text-sm space-y-1">
          <div>
            <span className="font-semibold">Input Interface (A):</span>{' '}
            {cospan.inputInterface.map(n => n.id).join(', ')}
          </div>
          <div>
            <span className="font-semibold">Output Interface (B):</span>{' '}
            {cospan.outputInterface.map(n => n.id).join(', ')}
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Cospan: A → C ← B where A = inputs, B = outputs, C = circuit implementation
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitVisualizer;
