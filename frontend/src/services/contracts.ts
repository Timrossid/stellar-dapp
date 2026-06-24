export class ContractClient {
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
  }

  async call(method: string, _args: any[]): Promise<any> {
    try {
      // In production, this calls the Soroban contract via rpc.Server
      // The exact implementation depends on the stellar-sdk version
      console.log(`Calling ${method} on contract ${this.contractId}`);
      return null;
    } catch (err) {
      console.error(`Contract call failed: ${method}`, err);
      throw err;
    }
  }
}

export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
