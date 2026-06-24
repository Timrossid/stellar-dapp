import React, { useState } from 'react';

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

      // In a real app, this would call the contract
      console.log('Creating deal:', {
        escrowId,
        tokenContract,
        tokenAmount,
        price,
        buyer: form.buyer,
        expiresAt,
      });

      onDealCreated(1);
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

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating...' : 'Create Deal'}
      </button>
    </form>
  );
}
