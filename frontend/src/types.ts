export interface Deal {
  id: number;
  seller: string;
  buyer: string;
  token_contract: string;
  token_amount: string;
  price: string;
  state: 'Pending' | 'Funded' | 'Released' | 'Cancelled' | 'Disputed';
  created_at: number;
  expires_at: number;
}

export interface VestingSchedule {
  beneficiary: string;
  total_amount: string;
  released_amount: string;
  start_time: number;
  duration: number;
  cliff_duration: number;
}

export interface ContractEvent {
  topic: string[];
  value: string;
  timestamp: number;
  txHash: string;
}

export type DealState = Deal['state'];
