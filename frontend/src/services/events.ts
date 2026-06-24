import { rpc } from '@stellar/stellar-sdk';
import type { xdr } from '@stellar/stellar-sdk';

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org';

export interface ContractEvent {
  topic: string[];
  value: string;
  txHash: string;
  ledger: number;
  timestamp: number;
}

export async function streamContractEvents(
  contractId: string,
  onEvent: (event: ContractEvent) => void,
  onError: (error: Error) => void,
  startLedger?: number
): Promise<() => void> {
  const server = new rpc.Server(RPC_URL);
  let cancelled = false;

  async function poll() {
    while (!cancelled) {
      try {
        const latest = await server.getLatestLedger();
        const ledger = startLedger || latest.sequence;
        const response = await server.getEvents({
          startLedger: ledger,
          filters: [
            {
              contractIds: [contractId],
              type: 'contract' as any,
            },
          ],
          limit: 100,
        });

        for (const rawEvent of response.events) {
          if (cancelled) break;

          const event = rawEvent as any;
          const topicVals = event.event?.topic?.() || [];
          const topic = topicVals.map((t: any) => String(t));

          onEvent({
            topic,
            value: JSON.stringify(event.event?.value || ''),
            txHash: event.id || '',
            ledger: event.ledger || 0,
            timestamp: event.ledgerClosedAt || Date.now(),
          });
        }
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof Error ? error : new Error('Event stream error'));
        }
      }

      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const pollPromise = poll();
  return () => {
    cancelled = true;
  };
}

export function formatEventName(topics: string[]): string {
  if (!topics.length) return 'Unknown Event';

  const eventMap: Record<string, string> = {
    mint: 'Tokens Minted',
    burn: 'Tokens Burned',
    xfer: 'Transfer',
    appr: 'Approval',
    'vest_c': 'Vesting Created',
    'vest_r': 'Vesting Released',
    pause: 'Contract Paused',
    unpause: 'Contract Unpaused',
    'dl_cre8': 'Deal Created',
    'dl_fund': 'Deal Funded',
    'dl_rel': 'Deal Released',
    'dl_can': 'Deal Cancelled',
    'dl_disp': 'Deal Disputed',
  };

  return eventMap[topics[0]] || topics[0];
}
