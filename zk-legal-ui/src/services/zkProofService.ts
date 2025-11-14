import * as snarkjs from 'snarkjs';
import { CircuitInput, ZKProof } from '@/types';

/**
 * Zero-Knowledge Proof Service
 * Handles generation and verification of ZK proofs for legal documents
 */
export class ZKProofService {
  private wasmPath: string;
  private zkeyPath: string;
  private vkeyPath: string;

  constructor(circuitName: string) {
    this.wasmPath = `/circuits/${circuitName}.wasm`;
    this.zkeyPath = `/circuits/${circuitName}.zkey`;
    this.vkeyPath = `/circuits/${circuitName}_vkey.json`;
  }

  /**
   * Generate a ZK proof for tax calculation
   * Proves that tax was calculated correctly without revealing income details
   */
  async generateTaxProof(input: CircuitInput): Promise<ZKProof> {
    try {
      console.log('Generating tax calculation proof...');

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        this.wasmPath,
        this.zkeyPath
      );

      return {
        proof: {
          pi_a: proof.pi_a,
          pi_b: proof.pi_b,
          pi_c: proof.pi_c,
          protocol: proof.protocol,
          curve: proof.curve,
        },
        publicSignals: publicSignals.map(String),
      };
    } catch (error) {
      console.error('Failed to generate proof:', error);
      throw new Error(`ZK proof generation failed: ${error}`);
    }
  }

  /**
   * Generate a ZK proof for means test
   * Proves eligibility without revealing exact financial details
   */
  async generateMeansTestProof(input: CircuitInput): Promise<ZKProof> {
    try {
      console.log('Generating means test proof...');

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        this.wasmPath,
        this.zkeyPath
      );

      return {
        proof: {
          pi_a: proof.pi_a,
          pi_b: proof.pi_b,
          pi_c: proof.pi_c,
          protocol: proof.protocol,
          curve: proof.curve,
        },
        publicSignals: publicSignals.map(String),
      };
    } catch (error) {
      console.error('Failed to generate means test proof:', error);
      throw new Error(`Means test proof generation failed: ${error}`);
    }
  }

  /**
   * Verify a ZK proof
   */
  async verifyProof(proof: ZKProof): Promise<boolean> {
    try {
      const vKey = await fetch(this.vkeyPath).then(r => r.json());

      const verified = await snarkjs.groth16.verify(
        vKey,
        proof.publicSignals,
        proof.proof
      );

      return verified;
    } catch (error) {
      console.error('Failed to verify proof:', error);
      return false;
    }
  }

  /**
   * Hash inputs for commitment
   */
  hashInputs(inputs: CircuitInput): string {
    const inputString = JSON.stringify(inputs);
    // In production, use proper cryptographic hash (e.g., Poseidon hash)
    return this.simpleHash(inputString);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// Circuit-specific services
export const taxCircuitService = new ZKProofService('tax_calculation');
export const meansTestCircuitService = new ZKProofService('means_test');
