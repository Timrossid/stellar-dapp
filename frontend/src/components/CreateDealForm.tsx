import React, { useState } from 'react';
import { useContractWrite } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Address, nativeToScVal } from '@stellar/stellar-sdk';

interface CreateDealFormProps {
  userAddress: string;
  escrowId: string;
  tokenContract: string;
  onDealCreated: (dealId: number) => void;
}

interface FormData {
  buyer: string;
  tokenAmount: string;
  price: string;
  expiresInDays: string;
}

export function CreateDealForm({ escrowId, tokenContract, onDealCreated }: CreateDealFormProps) {
  const [form, setForm] = useState<FormData>({
    buyer: '',
    tokenAmount: '',
    price: '',
    expiresInDays: '7',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { write, isPending, error: writeError } = useContractWrite();
  const { address, signTransaction } = useWallet();

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const tokenAmount = parseInt(form.tokenAmount);
      const price = parseInt(form.price);

      if (isNaN(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Token amount must be a positive number');
      }
      if (isNaN(price) || price <= 0) {
        throw new Error('Price must be a positive number');
      }
      if (!form.buyer || form.buyer.length < 56) {
        throw new Error('Please enter a valid Stellar public key');
      }

      const expiresInSeconds = parseInt(form.expiresInDays) * 86400;
      const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

      if (!address) {
        throw new Error('Please connect your wallet first');
      }

      // Arguments for create_deal:
      // seller, buyer, token_contract, token_amount, price, expires_at
      const args = [
        new Address(address).toScVal(),
        new Address(form.buyer).toScVal(),
        new Address(tokenContract).toScVal(),
        nativeToScVal(tokenAmount, { type: 'u64' }),
        nativeToScVal(price, { type: 'u64' }),
        nativeToScVal(expiresAt, { type: 'u64' }),
      ];

      const wrappedSignTransaction = async (xdr: string) => {
        const result = await signTransaction(xdr);
        return result.signedTxXdr;
      };

      await write(
        escrowId,
        'create_deal',
        args,
        address,
        import.meta.env.VITE_NETWORK_PASSPHRASE,
        wrappedSignTransaction
      );

      onDealCreated(1); // In a real app, we'd get the real deal ID from the transaction result
      setForm({
        buyer: '',
        tokenAmount: '',
        price: '',
        expiresInDays: '7',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = writeError || error;

  return (
    <form className="create-deal-form" onSubmit={handleSubmit}>
      <h3>Create New Deal</h3>

      <div className="form-group">
        <label htmlFor="buyer">Buyer Address</label>
        <input
          id="buyer"
          type="text"
          value={form.buyer}
          onChange={handleChange('buyer')}
          placeholder="G... (buyer's Stellar public key)"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="tokenAmount">Token Amount</label>
        <input
          id="tokenAmount"
          type="number"
          value={form.tokenAmount}
          onChange={handleChange('tokenAmount')}
          placeholder="100"
          min="1"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Price (in tokens)</label>
        <input
          id="price"
          type="number"
          value={form.price}
          onChange={handleChange('price')}
          placeholder="500"
          min="1"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="expiresInDays">Expires In (days)</label>
        <input
          id="expiresInDays"
          type="number"
          value={form.expiresInDays}
          onChange={handleChange('expiresInDays')}
          min="1"
          max="365"
          required
        />
      </div>

      {displayError && <p className="error-text">{displayError}</p>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={isSubmitting || isPending}
      >
        {isSubmitting || isPending ? 'Creating...' : 'Create Deal'}
      </button>
    </form>
  );
}
