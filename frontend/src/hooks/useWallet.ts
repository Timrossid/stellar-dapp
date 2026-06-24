import { useState, useEffect, useCallback } from 'react';
import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error('Freighter wallet not found. Please install the Freighter extension.');
      }

      const publicKey = await getAddress();
      setState({
        address: publicKey.address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (error) {
      setState({
        address: null,
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          const result = await getAddress();
          setState({
            address: result.address,
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        }
      } catch {
        // Wallet not available
      }
    };
    checkConnection();
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
  };
}
