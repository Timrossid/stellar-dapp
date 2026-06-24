#!/usr/bin/env node

/**
 * Stellar dApp Deployment Script
 * 
 * Usage:
 *   node scripts/deploy.mjs [network]
 *   node scripts/deploy.mjs testnet
 *   node scripts/deploy.mjs mainnet
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const NETWORKS = {
  testnet: {
    rpc: 'https://soroban-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2025',
  },
  mainnet: {
    rpc: 'https://soroban.stellar.org',
    passphrase: 'Public Global Stellar Network ; September 2025',
  },
};

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, {
    stdio: 'inherit',
    cwd: ROOT,
    ...opts,
  });
}

function getEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

async function main() {
  const networkName = process.argv[2] || 'testnet';
  const network = NETWORKS[networkName];

  if (!network) {
    console.error(`Unknown network: ${networkName}`);
    console.error(`Available: ${Object.keys(NETWORKS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🚀 Deploying to Stellar ${networkName}\n`);
  console.log(`   RPC: ${network.rpc}`);
  console.log(`   Network: ${network.passphrase}\n`);

  const secretKey = getEnv('SOROBAN_SECRET_KEY');
  const adminPublic = getEnv('ADMIN_PUBLIC_KEY');
  const feeCollector = getEnv('FEE_COLLECTOR');

  // 1. Build contracts
  console.log('\n📦 Building contracts...');
  run('cargo build --target wasm32-unknown-unknown --release', {
    cwd: join(ROOT, 'contracts/token'),
  });
  run('cargo build --target wasm32-unknown-unknown --release', {
    cwd: join(ROOT, 'contracts/escrow'),
  });

  // 2. Check if Soroban CLI is installed
  try {
    execSync('soroban --version', { stdio: 'pipe' });
  } catch {
    console.log('\n⬇️  Installing Soroban CLI...');
    run('cargo install soroban-cli --locked');
  }

  const tokenWasm = join(
    ROOT,
    'contracts/token/target/wasm32-unknown-unknown/release/stellar_token.wasm'
  );
  const escrowWasm = join(
    ROOT,
    'contracts/escrow/target/wasm32-unknown-unknown/release/stellar_escrow.wasm'
  );

  if (!existsSync(tokenWasm)) {
    throw new Error(`Token WASM not found at ${tokenWasm}`);
  }
  if (!existsSync(escrowWasm)) {
    throw new Error(`Escrow WASM not found at ${escrowWasm}`);
  }

  const baseArgs = [
    'soroban',
    '--rpc-url', network.rpc,
    '--network-passphrase', `"${network.passphrase}"`,
    '--source-account', secretKey,
  ];

  // 3. Deploy token contract
  console.log('\n🔗 Deploying token contract...');
  const tokenId = execSync(
    `soroban contract deploy --wasm ${tokenWasm} ${baseArgs.join(' ')}`,
    { encoding: 'utf8' }
  ).trim();
  console.log(`   Token Contract ID: ${tokenId}`);

  // 4. Deploy escrow contract
  console.log('\n🔗 Deploying escrow contract...');
  const escrowId = execSync(
    `soroban contract deploy --wasm ${escrowWasm} ${baseArgs.join(' ')}`,
    { encoding: 'utf8' }
  ).trim();
  console.log(`   Escrow Contract ID: ${escrowId}`);

  // 5. Initialize token contract
  console.log('\n⚙️  Initializing token contract...');
  execSync(
    `soroban contract invoke --id ${tokenId} ${baseArgs.join(' ')} -- initialize --admin ${adminPublic} --name '"StellarEscrowToken"' --symbol '"SET"'`,
    { stdio: 'inherit' }
  );

  // 6. Initialize escrow contract
  console.log('\n⚙️  Initializing escrow contract...');
  execSync(
    `soroban contract invoke --id ${escrowId} ${baseArgs.join(' ')} -- initialize --fee_collector ${feeCollector} --fee_bps 25 --token_contract ${tokenId}`,
    { stdio: 'inherit' }
  );

  // 7. Summary
  console.log('\n✅ Deployment complete!\n');
  console.log('📋 Contract Summary:');
  console.log(`   Token:  ${tokenId}`);
  console.log(`   Escrow: ${escrowId}`);
  console.log(`   Network: ${networkName}\n`);

  // Output env vars for frontend
  console.log('📝 Frontend env vars:');
  console.log(`   VITE_TOKEN_CONTRACT=${tokenId}`);
  console.log(`   VITE_ESCROW_CONTRACT=${escrowId}`);
  console.log(`   VITE_RPC_URL=${network.rpc}`);
  console.log(`   VITE_NETWORK_PASSPHRASE="${network.passphrase}"`);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});
