import { rpc, Contract, TransactionBuilder, Address, nativeToScVal } from '@stellar/stellar-sdk';

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

export class ContractClient {
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
  }

  async call(method: string, args: any[]): Promise<any> {
    try {
      const response = await (server as any).callContract({
        contract_id: this.contractId,
        function_name: method,
        arguments: args,
      });
      return response.result;
    } catch (err) {
      console.error(`Contract call failed: ${method}`, err);
      throw err;
    }
  }

  async send(
    method: string,
    args: any[],
    account: string,
    networkPassphrase: string,
    signTx: (xdr: string) => Promise<string>
  ): Promise<string> {
    const contract = new Contract(this.contractId);
    const op = contract.call(method, ...args);

    const accountData = await server.getAccount(account);

    const tx = new TransactionBuilder(accountData, {
      fee: 100,
      networkPassphrase: networkPassphrase,
    } as any)
      .addOperation(op)
      .setTimeout(300)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    const signedXdr = await signTx(preparedTx.toXDR());
    const result = await (server as any).sendTransaction(signedXdr);
    
    if (result.status === 'ERROR') {
      throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`);
    }

    return result.hash;
  }
}

export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
