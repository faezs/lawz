// Core types for the Zero-Knowledge Legal System

export interface NADRACredentials {
  fingerprint: string;
  citizenId: string;
  timestamp: number;
}

export interface LegalDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  createdAt: number;
  zkProof?: ZKProof;
  encryptedContent: string;
  lawFirmAddress?: string;
  paymentTxId?: string;
}

export enum DocumentType {
  TAX_CALCULATION = 'tax_calculation',
  MEANS_TEST = 'means_test',
  DIVORCE_SETTLEMENT = 'divorce_settlement',
  FINANCIAL_DISCLOSURE = 'financial_disclosure',
  PROPERTY_TRANSFER = 'property_transfer',
  CUSTOM = 'custom',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PROOF_GENERATING = 'proof_generating',
  PROOF_GENERATED = 'proof_generated',
  PAYMENT_PENDING = 'payment_pending',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export interface ZKProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

export interface TaxCalculationInput {
  income: number;
  deductions: number[];
  filingStatus: 'single' | 'married' | 'head_of_household';
  dependents: number;
}

export interface MeansTestInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  assets: AssetDeclaration[];
  liabilities: LiabilityDeclaration[];
  dependents: number;
}

export interface AssetDeclaration {
  type: string;
  value: number;
  encrypted: boolean;
}

export interface LiabilityDeclaration {
  type: string;
  amount: number;
  encrypted: boolean;
}

export interface ZcashWallet {
  address: string;
  balance: number;
  network: 'mainnet' | 'testnet';
}

export interface PaymentRequest {
  amount: number;
  recipient: string;
  memo?: string;
  documentId: string;
}

export interface LawFirm {
  id: string;
  name: string;
  address: string;
  zcashAddress: string;
  specializations: string[];
  rating: number;
  verified: boolean;
}

export interface AftokTimeLog {
  contributor: string;
  hours: number;
  date: number;
  projectId: string;
}

export interface CircuitInput {
  [key: string]: string | number | bigint;
}

export interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
}
