#!/usr/bin/env node

/**
 * Stellar Contract Interaction Script
 *
 * Usage:
 *   node scripts/interact.mjs <action> [args...]
 *
 * Actions:
 *   mint <tokenId> <to> <amount>
 *   balance <tokenId> <address>
 *   transfer <tokenId> <from> <to> <amount>
 *   create-deal <escrowId> <seller> <buyer> <tokenId> <tokenAmt> <price> <expiry>
 *   fund-deal <escrowId> <dealId> <buyer>
 *   release-deal <escrowId> <dealId>
 *   get-deal <escrowId> <dealId>
 */

import { execSync } from 'child_process';

const NETWORK = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const PASSPHRASE = process.env.SOROBAN_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2025';
const SECRET = process.env.SOROBAN_SECRET_KEY;

function soroban(args) {
  const cmd = [
    'soroban',
    'contract',
    'invoke',
    ...args,
    '--rpc-url', NETWORK,
    '--network-passphrase', `"${PASSPHRASE}"`,
    ...(SECRET ? ['--source-account', SECRET] : []),
  ].join(' ');

  console.log(`> ${cmd}\n`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(out.trim());
    return out.trim();
  } catch (err) {
    console.error('Command failed:', err.stderr?.toString() || err.message);
    process.exit(1);
  }
}

function main() {
  const [action, ...args] = process.argv.slice(2);

  if (!action) {
    console.log('Usage: node scripts/interact.mjs <action> [args...]\n');
    console.log('Actions:');
    console.log('  mint <tokenId> <to> <amount>');
    console.log('  balance <tokenId> <address>');
    console.log('  transfer <tokenId> <from> <to> <amount>');
    console.log('  create-deal <escrowId> <seller> <buyer> <tokenId> <tokenAmt> <price> <expiry>');
    console.log('  fund-deal <escrowId> <dealId> <buyer>');
    console.log('  release-deal <escrowId> <dealId>');
    console.log('  get-deal <escrowId> <dealId>');
    process.exit(0);
  }

  switch (action) {
    case 'mint': {
      const [id, to, amount] = args;
      soroban(['--id', id, '--', 'mint', '--to', to, '--amount', amount]);
      break;
    }
    case 'balance': {
      const [id, address] = args;
      soroban(['--id', id, '--', 'balance', '--id', address]);
      break;
    }
    case 'transfer': {
      const [id, from, to, amount] = args;
      soroban(['--id', id, '--', 'transfer', '--from', from, '--to', to, '--amount', amount]);
      break;
    }
    case 'create-deal': {
      const [escrowId, seller, buyer, tokenId, tokenAmt, price, expiry] = args;
      soroban([
        '--id', escrowId, '--',
        'create_deal',
        '--seller', seller,
        '--buyer', buyer,
        '--token_contract', tokenId,
        '--token_amount', tokenAmt,
        '--price', price,
        '--expires_at', expiry,
      ]);
      break;
    }
    case 'fund-deal': {
      const [escrowId, dealId, buyer] = args;
      soroban(['--id', escrowId, '--', 'fund_deal', '--deal_id', dealId, '--buyer', buyer]);
      break;
    }
    case 'release-deal': {
      const [escrowId, dealId] = args;
      soroban(['--id', escrowId, '--', 'release_deal', '--deal_id', dealId, '--caller', '']);
      break;
    }
    case 'get-deal': {
      const [escrowId, dealId] = args;
      soroban(['--id', escrowId, '--', 'get_deal', '--deal_id', dealId]);
      break;
    }
    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }
}

main();
