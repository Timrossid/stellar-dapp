import React, { useState } from 'react';
import type { Deal } from '../types';

interface DealListProps {
  deals: Deal[];
  userAddress: string;
  escrowId: string;
  isLoading: boolean;
  error: string | null;
}

const STATE_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Funded: '#3b82f6',
  Released: '#10b981',
  Cancelled: '#6b7280',
  Disputed: '#ef4444',
};

const STATE_LABELS: Record<string, string> = {
  Pending: 'Pending',
  Funded: 'Funded',
  Released: 'Released',
  Cancelled: 'Cancelled',
  Disputed: 'Disputed',
};

function DealCard({
  deal,
  userAddress,
  onAction,
}: {
  deal: Deal;
  userAddress: string;
  onAction: (dealId: number, action: string) => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isSeller = deal.seller === userAddress;
  const isBuyer = deal.buyer === userAddress;

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await onAction(deal.id, action);
    } finally {
      setActionLoading(null);
    }
  };

  const getAvailableActions = () => {
    const actions: { label: string; action: string; disabled: boolean }[] = [];

    if (deal.state === 'Pending') {
      if (isBuyer) {
        actions.push({ label: 'Fund', action: 'fund', disabled: false });
      }
      if (isSeller) {
        actions.push({ label: 'Cancel', action: 'cancel', disabled: false });
      }
    }

    if (deal.state === 'Funded') {
      if (isSeller) {
        actions.push({ label: 'Release', action: 'release', disabled: false });
      }
      if (isSeller || isBuyer) {
        actions.push({ label: 'Dispute', action: 'dispute', disabled: false });
      }
    }

    return actions;
  };

  return (
    <div className="deal-card" key={deal.id}>
      <div className="deal-header">
        <span className="deal-id">Deal #{deal.id}</span>
        <span
          className="deal-state"
          style={{ backgroundColor: STATE_COLORS[deal.state] || '#6b7280' }}
        >
          {STATE_LABELS[deal.state] || deal.state}
        </span>
      </div>

      <div className="deal-details">
        <div className="detail-row">
          <span className="label">Seller:</span>
          <span className="value mono">
            {deal.seller.slice(0, 8)}...{deal.seller.slice(-4)}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Buyer:</span>
          <span className="value mono">
            {deal.buyer.slice(0, 8)}...{deal.buyer.slice(-4)}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Tokens:</span>
          <span className="value">{deal.token_amount}</span>
        </div>
        <div className="detail-row">
          <span className="label">Price:</span>
          <span className="value">{deal.price}</span>
        </div>
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">
            {new Date(deal.created_at * 1000).toLocaleDateString()}
          </span>
        </div>
        {deal.expires_at > 0 && (
          <div className="detail-row">
            <span className="label">Expires:</span>
            <span className="value">
              {new Date(deal.expires_at * 1000).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {getAvailableActions().length > 0 && (
        <div className="deal-actions">
          {getAvailableActions().map(({ label, action, disabled }) => (
            <button
              key={action}
              className={`btn btn-sm btn-${action}`}
              onClick={() => handleAction(action)}
              disabled={disabled || actionLoading === action}
              type="button"
            >
              {actionLoading === action ? 'Processing...' : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DealList({ deals, userAddress, isLoading, error }: DealListProps) {
  const handleAction = async (dealId: number, action: string) => {
    console.log(`Action ${action} on deal ${dealId}`);
    // In production, this would call the contract
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading deals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="empty-state">
        <p>No deals found.</p>
        <p className="text-muted">Create a new deal to get started.</p>
      </div>
    );
  }

  return (
    <div className="deal-list">
      <h3>Your Deals ({deals.length})</h3>
      <div className="deal-grid">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            userAddress={userAddress}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}
