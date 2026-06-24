import React from 'react';

interface WalletConnectProps {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnect({
  address,
  isConnected,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          className="btn btn-secondary"
          onClick={onDisconnect}
          type="button"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <button
        className="btn btn-primary"
        onClick={onConnect}
        disabled={isConnecting}
        type="button"
      >
        {isConnecting ? 'Connecting...' : 'Connect Freighter'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
