/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_CONTRACT: string;
  readonly VITE_ESCROW_CONTRACT: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_NETWORK_PASSPHRASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
