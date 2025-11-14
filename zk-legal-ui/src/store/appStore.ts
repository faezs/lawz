import { create } from 'zustand';
import { NADRACredentials, ZcashWallet, LegalDocument } from '@/types';

interface AppState {
  // Authentication
  nadraCredentials: NADRACredentials | null;
  isAuthenticated: boolean;
  setNadraCredentials: (credentials: NADRACredentials | null) => void;

  // Wallet
  wallet: ZcashWallet | null;
  setWallet: (wallet: ZcashWallet | null) => void;

  // Documents
  documents: LegalDocument[];
  addDocument: (document: LegalDocument) => void;
  updateDocument: (id: string, updates: Partial<LegalDocument>) => void;
  getDocument: (id: string) => LegalDocument | undefined;

  // UI State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Authentication
  nadraCredentials: null,
  isAuthenticated: false,
  setNadraCredentials: (credentials) => set({
    nadraCredentials: credentials,
    isAuthenticated: credentials !== null,
  }),

  // Wallet
  wallet: null,
  setWallet: (wallet) => set({ wallet }),

  // Documents
  documents: [],
  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document],
  })),
  updateDocument: (id, updates) => set((state) => ({
    documents: state.documents.map((doc) =>
      doc.id === id ? { ...doc, ...updates } : doc
    ),
  })),
  getDocument: (id) => get().documents.find((doc) => doc.id === id),

  // UI State
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error }),
}));
