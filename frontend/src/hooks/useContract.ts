import { useState, useCallback } from 'react';
import { ContractClient, parseContractError } from '../services/contracts';

interface ContractState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useContractQuery<T>(contractId: string) {
  const [state, setState] = useState<ContractState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const query = useCallback(
    async (method: string, args: any[]) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const client = new ContractClient(contractId);

      try {
        const result = await client.call(method, args);
        setState({ data: result as T, isLoading: false, error: null });
        return result as T;
      } catch (error) {
        const message = parseContractError(error);
        setState({ data: null, isLoading: false, error: message });
        throw error;
      }
    },
    [contractId]
  );

  return { ...state, query };
}

export function useContractWrite() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const write = useCallback(
    async (
      contractId: string,
      method: string,
      args: any[],
      _source: string,
      _signTx: (xdr: string) => Promise<string>
    ) => {
      setIsPending(true);
      setError(null);
      const client = new ContractClient(contractId);

      try {
        const result = await client.call(method, args);
        setIsPending(false);
        return result;
      } catch (error) {
        const message = parseContractError(error);
        setError(message);
        setIsPending(false);
        throw error;
      }
    },
    []
  );

  return { write, isPending, error };
}
