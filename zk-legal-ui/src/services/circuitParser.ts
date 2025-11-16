/**
 * Circuit Parser and Graph Cospan Visualizer
 *
 * Parses circom circuit files to extract:
 * - Signal declarations (inputs, outputs, intermediates)
 * - Component instantiations (gates, comparators, etc.)
 * - Constraints and connections
 *
 * Generates graph cospan representation:
 * - Nodes: Signals and components
 * - Edges: Data flow and constraints
 * - Morphisms: Input/output mappings
 */

export interface CircuitSignal {
  name: string;
  type: 'input' | 'output' | 'intermediate';
  visibility: 'private' | 'public';
  dimension?: number; // For arrays
  bitWidth?: number;
}

export interface CircuitComponent {
  id: string;
  name: string;
  template: string;
  parameters?: number[];
  inputs: string[];
  outputs: string[];
}

export interface CircuitConstraint {
  type: 'equality' | 'assignment' | 'comparison';
  left: string;
  operator: '===' | '<==' | '<--' | '-->';
  right: string;
  expression?: string;
}

export interface CircuitEdge {
  from: string; // Source node (signal or component output)
  to: string; // Target node (signal or component input)
  type: 'data_flow' | 'constraint' | 'component_io';
  label?: string;
}

export interface CircuitNode {
  id: string;
  type: 'signal' | 'component' | 'constant';
  label: string;
  properties: Record<string, any>;
  position?: { x: number; y: number }; // For visualization
}

/**
 * Graph Cospan representation
 * Cospan: A → C ← B where:
 * - A: Input interface (signals)
 * - C: Circuit implementation (components + constraints)
 * - B: Output interface (signals)
 */
export interface CircuitCospan {
  name: string;
  version: string;

  // Category theory structure
  inputInterface: CircuitNode[]; // Object A
  outputInterface: CircuitNode[]; // Object B
  implementation: CircuitNode[]; // Object C (includes A and B)

  // Morphisms
  inputMorphism: Map<string, string>; // A → C
  outputMorphism: Map<string, string>; // B → C

  // Graph structure
  nodes: CircuitNode[];
  edges: CircuitEdge[];

  // Metadata
  signals: CircuitSignal[];
  components: CircuitComponent[];
  constraints: CircuitConstraint[];

  // Statistics
  stats: {
    totalSignals: number;
    privateSignals: number;
    publicSignals: number;
    totalComponents: number;
    totalConstraints: number;
    maxDepth: number;
  };
}

/**
 * Parse circom circuit source code
 */
export class CircuitParser {
  private source: string;
  private lines: string[];

  constructor(source: string) {
    this.source = source;
    this.lines = source.split('\n');
  }

  /**
   * Parse circuit and generate cospan representation
   */
  parse(): CircuitCospan {
    const signals = this.extractSignals();
    const components = this.extractComponents();
    const constraints = this.extractConstraints();
    const { nodes, edges } = this.buildGraph(signals, components, constraints);

    // Separate input and output interfaces
    const inputInterface = nodes.filter(n =>
      n.type === 'signal' && signals.find(s => s.name === n.id && s.type === 'input')
    );

    const outputInterface = nodes.filter(n =>
      n.type === 'signal' && signals.find(s => s.name === n.id && s.type === 'output')
    );

    // Create morphisms
    const inputMorphism = new Map<string, string>();
    inputInterface.forEach(node => {
      inputMorphism.set(node.id, node.id); // Identity mapping for now
    });

    const outputMorphism = new Map<string, string>();
    outputInterface.forEach(node => {
      outputMorphism.set(node.id, node.id);
    });

    // Calculate statistics
    const stats = {
      totalSignals: signals.length,
      privateSignals: signals.filter(s => s.visibility === 'private').length,
      publicSignals: signals.filter(s => s.visibility === 'public').length,
      totalComponents: components.length,
      totalConstraints: constraints.length,
      maxDepth: this.calculateMaxDepth(nodes, edges),
    };

    const circuitName = this.extractCircuitName();
    const version = this.extractVersion();

    return {
      name: circuitName,
      version,
      inputInterface,
      outputInterface,
      implementation: nodes,
      inputMorphism,
      outputMorphism,
      nodes,
      edges,
      signals,
      components,
      constraints,
      stats,
    };
  }

  /**
   * Extract signal declarations from circuit
   */
  private extractSignals(): CircuitSignal[] {
    const signals: CircuitSignal[] = [];
    const signalRegex = /signal\s+(input|output)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\[(\d+)\])?/g;

    for (const line of this.lines) {
      let match;
      while ((match = signalRegex.exec(line)) !== null) {
        const [, typeKeyword, name, dimension] = match;

        // Determine signal type
        let type: 'input' | 'output' | 'intermediate' = 'intermediate';
        if (typeKeyword === 'input') type = 'input';
        else if (typeKeyword === 'output') type = 'output';

        // Determine visibility (check component main declaration)
        const visibility = this.isPublicSignal(name) ? 'public' : 'private';

        signals.push({
          name,
          type,
          visibility,
          dimension: dimension ? parseInt(dimension) : undefined,
        });
      }
    }

    return signals;
  }

  /**
   * Extract component instantiations
   */
  private extractComponents(): CircuitComponent[] {
    const components: CircuitComponent[] = [];
    const componentRegex = /component\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;

    for (const line of this.lines) {
      let match;
      while ((match = componentRegex.exec(line)) !== null) {
        const [, name, template, paramsStr] = match;

        const parameters = paramsStr
          ? paramsStr.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))
          : [];

        // Extract inputs and outputs (simplified - in production, parse template definition)
        const inputs: string[] = [];
        const outputs: string[] = [];

        // Look for assignments to this component
        const assignRegex = new RegExp(`${name}\\.in(?:\\[(\\d+)\\])?\\s*<==\\s*([^;]+)`, 'g');
        let assignMatch;
        while ((assignMatch = assignRegex.exec(this.source)) !== null) {
          inputs.push(assignMatch[2].trim());
        }

        // Look for outputs from this component
        const outRegex = new RegExp(`([a-zA-Z_][a-zA-Z0-9_]*)\\s*<==\\s*${name}\\.out`, 'g');
        let outMatch;
        while ((outMatch = outRegex.exec(this.source)) !== null) {
          outputs.push(outMatch[1]);
        }

        components.push({
          id: name,
          name,
          template,
          parameters,
          inputs,
          outputs,
        });
      }
    }

    return components;
  }

  /**
   * Extract constraints (===, <==, etc.)
   */
  private extractConstraints(): CircuitConstraint[] {
    const constraints: CircuitConstraint[] = [];

    // Constraint patterns
    const patterns = [
      { regex: /([^;]+)\s*===\s*([^;]+)/g, operator: '===' as const, type: 'equality' as const },
      { regex: /([^;]+)\s*<==\s*([^;]+)/g, operator: '<==' as const, type: 'assignment' as const },
      { regex: /([^;]+)\s*<--\s*([^;]+)/g, operator: '<--' as const, type: 'assignment' as const },
      { regex: /([^;]+)\s*-->\s*([^;]+)/g, operator: '-->' as const, type: 'assignment' as const },
    ];

    for (const line of this.lines) {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
        continue;
      }

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          constraints.push({
            type: pattern.type,
            left: match[1].trim(),
            operator: pattern.operator,
            right: match[2].trim(),
            expression: line.trim(),
          });
        }
      }
    }

    return constraints;
  }

  /**
   * Build graph structure from parsed elements
   */
  private buildGraph(
    signals: CircuitSignal[],
    components: CircuitComponent[],
    constraints: CircuitConstraint[]
  ): { nodes: CircuitNode[]; edges: CircuitEdge[] } {
    const nodes: CircuitNode[] = [];
    const edges: CircuitEdge[] = [];
    let nodeIdCounter = 0;

    // Create nodes for signals
    for (const signal of signals) {
      nodes.push({
        id: signal.name,
        type: 'signal',
        label: `${signal.name} (${signal.type})`,
        properties: {
          signalType: signal.type,
          visibility: signal.visibility,
          dimension: signal.dimension,
        },
      });
    }

    // Create nodes for components
    for (const component of components) {
      nodes.push({
        id: component.id,
        type: 'component',
        label: `${component.name}: ${component.template}`,
        properties: {
          template: component.template,
          parameters: component.parameters,
        },
      });

      // Create edges for component inputs
      for (const input of component.inputs) {
        edges.push({
          from: input,
          to: component.id,
          type: 'component_io',
          label: 'input',
        });
      }

      // Create edges for component outputs
      for (const output of component.outputs) {
        edges.push({
          from: component.id,
          to: output,
          type: 'component_io',
          label: 'output',
        });
      }
    }

    // Create edges from constraints
    for (const constraint of constraints) {
      // Parse left and right sides to extract signals
      const leftSignals = this.extractSignalsFromExpression(constraint.left);
      const rightSignals = this.extractSignalsFromExpression(constraint.right);

      for (const left of leftSignals) {
        for (const right of rightSignals) {
          edges.push({
            from: right,
            to: left,
            type: 'constraint',
            label: constraint.operator,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Extract signal names from an expression
   */
  private extractSignalsFromExpression(expr: string): string[] {
    const signals: string[] = [];
    const signalRegex = /([a-zA-Z_][a-zA-Z0-9_]*)/g;

    let match;
    while ((match = signalRegex.exec(expr)) !== null) {
      const name = match[1];
      // Filter out keywords and numbers
      if (!this.isKeyword(name) && isNaN(Number(name))) {
        signals.push(name);
      }
    }

    return signals;
  }

  /**
   * Check if signal is public (from component main declaration)
   */
  private isPublicSignal(signalName: string): boolean {
    const mainRegex = /component\s+main\s*\{[^}]*public\s*\[([^\]]+)\]/;
    const match = this.source.match(mainRegex);

    if (match) {
      const publicSignals = match[1].split(',').map(s => s.trim());
      return publicSignals.includes(signalName);
    }

    return false;
  }

  /**
   * Calculate maximum depth of circuit (longest path from input to output)
   */
  private calculateMaxDepth(nodes: CircuitNode[], edges: CircuitEdge[]): number {
    // Build adjacency list
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adj.has(edge.from)) {
        adj.set(edge.from, []);
      }
      adj.get(edge.from)!.push(edge.to);
    }

    // Find input nodes
    const inputNodes = nodes.filter(n =>
      n.type === 'signal' && n.properties.signalType === 'input'
    );

    // DFS to find max depth
    const visited = new Set<string>();
    let maxDepth = 0;

    const dfs = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);

      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, depth + 1);
      }

      visited.delete(nodeId);
    };

    for (const inputNode of inputNodes) {
      dfs(inputNode.id, 0);
    }

    return maxDepth;
  }

  /**
   * Extract circuit name from template declaration
   */
  private extractCircuitName(): string {
    const templateRegex = /template\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const match = this.source.match(templateRegex);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Extract circom version
   */
  private extractVersion(): string {
    const versionRegex = /pragma\s+circom\s+([\d.]+)/;
    const match = this.source.match(versionRegex);
    return match ? match[1] : '2.0.0';
  }

  /**
   * Check if string is a circom keyword
   */
  private isKeyword(str: string): boolean {
    const keywords = [
      'signal', 'input', 'output', 'component', 'template', 'include',
      'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'public', 'private', 'pragma', 'circom', 'main'
    ];
    return keywords.includes(str);
  }
}

/**
 * Fetch and parse circuit from file
 */
export async function parseCircuitFromFile(circuitPath: string): Promise<CircuitCospan> {
  try {
    const response = await fetch(circuitPath);
    const source = await response.text();
    const parser = new CircuitParser(source);
    return parser.parse();
  } catch (error) {
    console.error('Failed to parse circuit:', error);
    throw new Error(`Circuit parsing failed: ${error}`);
  }
}

/**
 * Parse circuit from source code
 */
export function parseCircuitFromSource(source: string): CircuitCospan {
  const parser = new CircuitParser(source);
  return parser.parse();
}

/**
 * Export circuit cospan to various formats
 */
export class CircuitExporter {
  /**
   * Export to DOT format (Graphviz)
   */
  static toDOT(cospan: CircuitCospan): string {
    let dot = `digraph ${cospan.name} {\n`;
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n\n';

    // Define nodes
    for (const node of cospan.nodes) {
      const shape = node.type === 'signal' ? 'ellipse' : 'box';
      const color = node.type === 'component' ? 'lightblue' : 'lightgreen';
      dot += `  ${node.id} [label="${node.label}", shape=${shape}, style=filled, fillcolor=${color}];\n`;
    }

    dot += '\n';

    // Define edges
    for (const edge of cospan.edges) {
      const label = edge.label || '';
      const style = edge.type === 'constraint' ? 'dashed' : 'solid';
      dot += `  ${edge.from} -> ${edge.to} [label="${label}", style=${style}];\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Export to JSON (for D3.js, cytoscape.js, etc.)
   */
  static toJSON(cospan: CircuitCospan): string {
    return JSON.stringify({
      name: cospan.name,
      version: cospan.version,
      nodes: cospan.nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        ...n.properties,
      })),
      edges: cospan.edges.map(e => ({
        source: e.from,
        target: e.to,
        type: e.type,
        label: e.label,
      })),
      stats: cospan.stats,
    }, null, 2);
  }

  /**
   * Export to Mermaid diagram
   */
  static toMermaid(cospan: CircuitCospan): string {
    let mermaid = 'graph LR\n';

    // Add nodes
    for (const node of cospan.nodes) {
      const shape = node.type === 'signal' ? '(())' : '[]';
      const label = node.label.replace(/[()]/g, '');
      mermaid += `  ${node.id}${shape[0]}${label}${shape[1]}\n`;
    }

    // Add edges
    for (const edge of cospan.edges) {
      const arrow = edge.type === 'constraint' ? '-.->': '-->';
      const label = edge.label ? `|${edge.label}|` : '';
      mermaid += `  ${edge.from} ${arrow}${label} ${edge.to}\n`;
    }

    return mermaid;
  }

  /**
   * Export to Cytoscape.js format
   */
  static toCytoscape(cospan: CircuitCospan): any {
    return {
      elements: {
        nodes: cospan.nodes.map(n => ({
          data: {
            id: n.id,
            label: n.label,
            type: n.type,
            ...n.properties,
          },
        })),
        edges: cospan.edges.map((e, i) => ({
          data: {
            id: `e${i}`,
            source: e.from,
            target: e.to,
            label: e.label,
            type: e.type,
          },
        })),
      },
      style: [
        {
          selector: 'node[type="signal"]',
          style: {
            'background-color': '#90EE90',
            'label': 'data(label)',
            'shape': 'ellipse',
          },
        },
        {
          selector: 'node[type="component"]',
          style: {
            'background-color': '#ADD8E6',
            'label': 'data(label)',
            'shape': 'rectangle',
          },
        },
        {
          selector: 'edge[type="constraint"]',
          style: {
            'line-style': 'dashed',
            'label': 'data(label)',
          },
        },
      ],
    };
  }
}
