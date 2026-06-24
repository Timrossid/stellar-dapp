# Stellar Escrow dApp

A production-ready decentralized escrow application built on **Stellar Soroban** smart contracts. Features inter-contract communication, real-time event streaming, token vesting, and a mobile-responsive React frontend.

## Architecture

```
stellar-dapp/
├── contracts/
│   ├── token/           # Advanced token contract with vesting
│   └── escrow/          # Escrow contract (inter-contract calls)
├── frontend/            # React + Vite + TypeScript app
├── scripts/             # Deployment & interaction scripts
├── .github/workflows/   # CI/CD pipelines
└── docs/                # Documentation
```

## Smart Contracts

### Token Contract (`contracts/token`)
- ERC-20-like token with mint, burn, transfer, approve, transferFrom
- **Vesting schedules** with cliff, duration, and linear release
- Pause/unpause functionality
- Events for all operations (mint, burn, transfer, approval, vesting)

### Escrow Contract (`contracts/escrow`)
- Create peer-to-peer escrow deals (seller, buyer, token amount, price, expiry)
- **Inter-contract communication** — calls Token contract for transfers
- Deal lifecycle: `Pending → Funded → Released | Cancelled | Disputed`
- Fee collection mechanism (configurable basis points)
- Events for all state transitions

## Features

- ✅ Advanced smart contracts with vesting & escrow logic
- ✅ Inter-contract communication (escrow calls token)
- ✅ Event streaming & real-time updates
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Mobile responsive UI (React + Vite + TypeScript)
- ✅ Error handling & loading states
- ✅ 5+ passing contract tests
- ✅ Wallet connection (Freighter)
- ✅ Production-ready architecture

## Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup)
- [Node.js](https://nodejs.org/) 18+
- [Freighter Wallet](https://freighter.app/) browser extension

## Quick Start

### 1. Install dependencies

```bash
# Install Soroban CLI
cargo install soroban-cli --locked

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install frontend dependencies
cd frontend && npm install
```

### 2. Build contracts

```bash
cargo build --target wasm32-unknown-unknown --release
```

### 3. Run tests

```bash
# Token contract tests
cd contracts/token && cargo test

# Escrow contract tests
cd contracts/escrow && cargo test
```

### 4. Deploy contracts

```bash
# Set environment variables
export SOROBAN_SECRET_KEY="your_private_key"
export ADMIN_PUBLIC_KEY="your_public_key"
export FEE_COLLECTOR="fee_collector_address"

# Deploy to testnet
node scripts/deploy.mjs testnet
```

### 5. Start frontend

```bash
cd frontend
cp .env.example .env  # Add your contract IDs
npm run dev           # http://localhost:3000
```

## Environment Variables

```env
VITE_TOKEN_CONTRACT=CCY3T...
VITE_ESCROW_CONTRACT=CCZ4T...
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2025
```

## API Reference

### Token Contract
| Method | Description |
|--------|-------------|
| `initialize(admin, name, symbol)` | Initialize token |
| `mint(to, amount)` | Mint new tokens (owner only) |
| `burn(from, amount)` | Burn tokens |
| `transfer(from, to, amount)` | Transfer tokens |
| `approve(from, spender, amount, expiration)` | Approve spender |
| `transfer_from(spender, from, to, amount)` | Transfer on behalf |
| `create_vesting_schedule(admin, beneficiary, total, start, duration, cliff)` | Create vesting |
| `release_vested_tokens(beneficiary)` | Release vested tokens |
| `balance(id)` | Get balance |
| `total_supply()` | Get total supply |

### Escrow Contract
| Method | Description |
|--------|-------------|
| `initialize(fee_collector, fee_bps, token_contract)` | Initialize escrow |
| `create_deal(seller, buyer, token_contract, token_amount, price, expires_at)` | Create deal |
| `fund_deal(deal_id, buyer)` | Fund a deal |
| `release_deal(deal_id, caller)` | Release funds |
| `cancel_deal(deal_id, caller)` | Cancel deal |
| `dispute_deal(deal_id, caller)` | Dispute deal |
| `get_deal(deal_id)` | Get deal details |
| `get_user_deals(user)` | Get user's deals |

## CI/CD

The project includes two GitHub Actions workflows:

1. **CI/CD Pipeline** (`.github/workflows/ci.yml`)
   - Runs on push/PR to main
   - Contract tests, linting, build
   - Frontend build & type check
   - Deploys to Vercel on main

2. **Contract Deployment** (`.github/workflows/contract-deploy.yml`)
   - Manual trigger (workflow_dispatch)
   - Build and deploy to testnet/mainnet
   - Initializes contracts after deployment

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npx vercel --prod
```

### Contracts (Soroban CLI)
```bash
node scripts/deploy.mjs testnet
```

## Testing

```bash
# All contract tests
cargo test

# With output
cargo test -- --nocapture

# Specific test
cargo test test_fund_and_release_deal -- --nocapture
```

## Demo

- **Live App**: https://stellar-escrow-dapp.vercel.app
- **Demo Video**: https://youtu.be/your-video
- **Token Contract**: `CCY3T...` (testnet)
- **Escrow Contract**: `CCZ4T...` (testnet)
