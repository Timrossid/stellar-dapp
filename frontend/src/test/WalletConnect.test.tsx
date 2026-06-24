import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletConnect } from '../components/WalletConnect';

describe('WalletConnect', () => {
  it('renders connect button when not connected', () => {
    render(
      <WalletConnect
        address={null}
        isConnected={false}
        isConnecting={false}
        error={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('Connect Freighter')).toBeTruthy();
  });

  it('shows loading state while connecting', () => {
    render(
      <WalletConnect
        address={null}
        isConnected={false}
        isConnecting={true}
        error={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('Connecting...')).toBeTruthy();
  });

  it('shows address and disconnect when connected', () => {
    render(
      <WalletConnect
        address="GCVNDQJ2YKZOI4X4W2W2GN2O4X4W2W2GN2O4X4W2W2GN2O4X4W2W2G"
        isConnected={true}
        isConnecting={false}
        error={null}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('Disconnect')).toBeTruthy();
    expect(screen.getByText(/GCVNDQJ2/)).toBeTruthy();
  });

  it('shows error message when error is provided', () => {
    render(
      <WalletConnect
        address={null}
        isConnected={false}
        isConnecting={false}
        error="Wallet connection failed"
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('Wallet connection failed')).toBeTruthy();
  });

  it('calls onConnect when connect button is clicked', () => {
    const onConnect = vi.fn();
    render(
      <WalletConnect
        address={null}
        isConnected={false}
        isConnecting={false}
        error={null}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Connect Freighter'));
    expect(onConnect).toHaveBeenCalledOnce();
  });
});
