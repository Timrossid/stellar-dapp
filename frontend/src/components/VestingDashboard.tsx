import React, { useState } from 'react';
import type { VestingSchedule } from '../types';

interface VestingDashboardProps {
  userAddress: string;
  tokenContract: string;
}

export function VestingDashboard({ userAddress }: VestingDashboardProps) {
  const [vesting] = useState<VestingSchedule | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="vesting-dashboard">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading vesting info...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vesting-dashboard">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!vesting) {
    return null;
  }

  const total = Number(vesting.total_amount);
  const released = Number(vesting.released_amount);
  const vestedPct = total > 0 ? Math.round((released / total) * 100) : 0;

  return (
    <div className="vesting-dashboard">
      <h3>Vesting Schedule</h3>

      <div className="vesting-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${vestedPct}%` }}
          />
        </div>
        <span className="progress-text">{vestedPct}% vested</span>
      </div>

      <div className="vesting-details">
        <div className="detail-row">
          <span className="label">Total:</span>
          <span className="value">{vesting.total_amount}</span>
        </div>
        <div className="detail-row">
          <span className="label">Released:</span>
          <span className="value">{vesting.released_amount}</span>
        </div>
        <div className="detail-row">
          <span className="label">Cliff:</span>
          <span className="value">{vesting.cliff_duration}s</span>
        </div>
        <div className="detail-row">
          <span className="label">Duration:</span>
          <span className="value">{vesting.duration}s</span>
        </div>
      </div>

      <button className="btn btn-primary" type="button">
        Release Vested Tokens
      </button>
    </div>
  );
}
