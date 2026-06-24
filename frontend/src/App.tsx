import React, { useState, useEffect } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { CreateDealForm } from './components/CreateDealForm';
import { DealList } from './components/DealList';
import { EventStream } from './components/EventStream';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { useWallet } from './hooks/useWallet';
import type { Deal } from './types';

const ESCROW_ID = import.meta.env.VITE_ESCROW_CONTRACT || '';
const TOKEN_ID = import.meta.env.VITE_TOKEN_CONTRACT || '';

function App() {
  const wallet = useWallet();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deals' | 'create' | 'events'>('deals');
  const [txStatus, setTxStatus] = useState<{
    hash?: string;
    status: 'pending' | 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      loadDeals();
    }
  }, [wallet.isConnected, wallet.address]);

  const loadDeals = async () => {
    setDealsLoading(true);
    setDealsError(null);
    try {
      // In production, this would query the escrow contract
      await new Promise((r) => setTimeout(r, 1000));
      setDeals([]);
    } catch (error) {
      setDealsError(
        error instanceof Error ? error.message : 'Failed to load deals'
      );
    } finally {
      setDealsLoading(false);
    }
  };

  const handleDealCreated = async (dealId: number) => {
    setTxStatus({
      status: 'success',
      message: `Deal #${dealId} created successfully!`,
    });
    setActiveTab('deals');
    await loadDeals();
    setTimeout(() => setTxStatus(null), 5000);
  };

  if (!wallet.isConnected) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-content">
            <h1>Stellar Escrow</h1>
            <p className="subtitle">Decentralized escrow on Stellar Soroban</p>
          </div>
        </header>
        <main className="main">
          <div className="landing">
            <div className="landing-card">
              <h2>Welcome to Stellar Escrow dApp</h2>
              <p>
                Create and manage trustless escrow deals using Stellar Soroban
                smart contracts. Connect your Freighter wallet to get started.
              </p>
              <WalletConnect
                address={wallet.address}
                isConnected={wallet.isConnected}
                isConnecting={wallet.isConnecting}
                error={wallet.error}
                onConnect={wallet.connect}
                onDisconnect={wallet.disconnect}
              />
            </div>

            <div className="features">
              <div className="feature-card">
                <h3>Trustless Escrow</h3>
                <p>Secure peer-to-peer trading with smart contract guarantees</p>
              </div>
              <div className="feature-card">
                <h3>Real-time Events</h3>
                <p>Live streaming of contract events and updates</p>
              </div>
              <div className="feature-card">
                <h3>Token Vesting</h3>
                <p>Advanced vesting schedules with cliff and release logic</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>Stellar Escrow</h1>
          </div>
          <div className="header-right">
            {wallet.address && (
              <div className="network-badge">
                <span className="dot" />
                Testnet
              </div>
            )}
            <WalletConnect
              address={wallet.address}
              isConnected={wallet.isConnected}
              isConnecting={wallet.isConnecting}
              error={wallet.error}
              onConnect={wallet.connect}
              onDisconnect={wallet.disconnect}
            />
          </div>
        </div>
      </header>

      {txStatus && (
        <div className={`tx-toast tx-toast-${txStatus.status}`}>
          {txStatus.message}
          {txStatus.hash && (
            <span className="tx-hash mono">
              Tx: {txStatus.hash.slice(0, 10)}...
            </span>
          )}
        </div>
      )}

      <main className="main">
        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'deals' ? 'active' : ''}`}
            onClick={() => setActiveTab('deals')}
            type="button"
          >
            Your Deals
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
            type="button"
          >
            Create Deal
          </button>
          <button
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
            type="button"
          >
            Live Events
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === 'deals' && (
            <ErrorBoundary>
              <DealList
                deals={deals}
                userAddress={wallet.address!}
                escrowId={ESCROW_ID}
                isLoading={dealsLoading}
                error={dealsError}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'create' && (
            <ErrorBoundary>
              <CreateDealForm
                userAddress={wallet.address!}
                escrowId={ESCROW_ID}
                tokenContract={TOKEN_ID}
                onDealCreated={handleDealCreated}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'events' && (
            <ErrorBoundary>
              <EventStream
                contractIds={[ESCROW_ID, TOKEN_ID].filter(Boolean)}
                isActive={true}
              />
            </ErrorBoundary>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Stellar Escrow dApp &mdash; Built on Soroban</p>
      </footer>
    </div>
  );
}

export default App;
