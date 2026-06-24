import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateDealForm } from '../components/CreateDealForm';

describe('CreateDealForm', () => {
  const defaultProps = {
    userAddress: 'GCVNDQJ2YKZOI4X4W2W2GN2O4X4W2W2GN2O4X4W2W2GN2O4X4W',
    escrowId: 'CCZ4T...',
    tokenContract: 'CCY3T...',
    onDealCreated: vi.fn(),
  };

  it('renders all form fields', () => {
    render(<CreateDealForm {...defaultProps} />);

    expect(screen.getByLabelText('Buyer Address')).toBeTruthy();
    expect(screen.getByLabelText('Token Amount')).toBeTruthy();
    expect(screen.getByLabelText('Price (in tokens)')).toBeTruthy();
    expect(screen.getByLabelText('Expires In (days)')).toBeTruthy();
    expect(screen.getByText('Create Deal')).toBeTruthy();
  });

  it('shows validation error for empty buyer address', async () => {
    render(<CreateDealForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Create Deal'));

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid Stellar public key/)).toBeTruthy();
    });
  });

  it('shows validation error for invalid amount', async () => {
    render(<CreateDealForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Buyer Address'), {
      target: { value: 'GCVNDQJ2YKZOI4X4W2W2GN2O4X4W2W2GN2O4X4W2W2GN2O4X4W' },
    });
    fireEvent.change(screen.getByLabelText('Token Amount'), {
      target: { value: '-5' },
    });
    fireEvent.change(screen.getByLabelText('Price (in tokens)'), {
      target: { value: '100' },
    });

    fireEvent.click(screen.getByText('Create Deal'));

    await waitFor(() => {
      expect(screen.getByText(/Token amount must be a positive number/)).toBeTruthy();
    });
  });
});
