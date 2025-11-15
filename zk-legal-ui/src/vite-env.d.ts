/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AFTOK_API_ENDPOINT?: string;
  readonly VITE_NADRA_API_ENDPOINT?: string;
  readonly VITE_ZCASH_NETWORK?: string;
  readonly VITE_ZASHI_API_ENDPOINT?: string;
  readonly VITE_ENABLE_REAL_NADRA?: string;
  readonly VITE_ENABLE_MAINNET?: string;
  readonly VITE_DEBUG_MODE?: string;
  readonly VITE_MOCK_WALLET?: string;
  readonly VITE_MOCK_FINGERPRINT?: string;
  readonly VITE_CIRCUITS_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'snarkjs' {
  export const groth16: any;
}
