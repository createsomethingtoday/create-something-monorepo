#!/usr/bin/env node

import { lstat, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

import { HTTPFacilitatorClient } from '@x402/core/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import {
  BASE_SEPOLIA_USDC,
  CANARY_AMOUNT,
  CANARY_FACILITATOR_URL,
  runX402Canary
} from './lib/agent-commercial-x402-canary.mjs';

const BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org';
const CIRCLE_FAUCET_URL = 'https://faucet.circle.com/?allow=true';
const BALANCE_ABI = parseAbi(['function balanceOf(address owner) view returns (uint256)']);

function parseOptions(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('--')) {
      throw new Error(`unexpected argument: ${argument}`);
    }
    if (argument === '--settle') {
      options.set('settle', true);
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${argument}`);
    }
    options.set(argument.slice(2), value);
    index += 1;
  }
  return options;
}

function requiredOption(options, name) {
  const value = options.get(name);
  if (!value) {
    throw new Error(`--${name} is required`);
  }
  return value;
}

function requiredAbsolutePath(options, name) {
  const value = requiredOption(options, name);
  if (!isAbsolute(value)) {
    throw new Error(`--${name} must be an absolute path`);
  }
  return value;
}

async function loadDisposableAccount(keyFile) {
  const keyStat = await lstat(keyFile);
  if (!keyStat.isFile() || (keyStat.mode & 0o077) !== 0) {
    throw new Error('key file must be a regular file with mode 0600');
  }

  const privateKey = (await readFile(keyFile, 'utf8')).trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error('key file does not contain a valid private key');
  }
  return privateKeyToAccount(privateKey);
}

function createFacilitator() {
  return new HTTPFacilitatorClient({
    url: CANARY_FACILITATOR_URL,
    timeoutMs: 30_000
  });
}

async function readTestUsdcBalance(address) {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC_URL)
  });
  return publicClient.readContract({
    address: BASE_SEPOLIA_USDC,
    abi: BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address]
  });
}

async function createWallet(options) {
  const keyFile = requiredAbsolutePath(options, 'key-file');
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  await writeFile(keyFile, `${privateKey}\n`, { flag: 'wx', mode: 0o600 });
  return { status: 'created', address: account.address, keyFile };
}

async function preflight(options) {
  const account = await loadDisposableAccount(requiredAbsolutePath(options, 'key-file'));
  const facilitator = createFacilitator();
  const [supported, balance] = await Promise.all([
    facilitator.getSupported(),
    readTestUsdcBalance(account.address)
  ]);
  const supportsCanary = supported.kinds?.some(
    (kind) => kind.x402Version === 2 && kind.scheme === 'exact' && kind.network === 'eip155:84532'
  );

  return {
    status: supportsCanary && balance >= BigInt(CANARY_AMOUNT) ? 'ready' : 'funding_required',
    address: account.address,
    testUsdcAtomicBalance: balance.toString(),
    facilitatorSupportsCanary: Boolean(supportsCanary),
    faucet: CIRCLE_FAUCET_URL
  };
}

async function executeCanary(options) {
  if (!options.get('settle')) {
    throw new Error('run requires the explicit --settle flag');
  }

  const account = await loadDisposableAccount(requiredAbsolutePath(options, 'key-file'));
  const payTo = requiredOption(options, 'pay-to');
  const receiptFile = requiredAbsolutePath(options, 'receipt');
  const balance = await readTestUsdcBalance(account.address);

  if (balance < BigInt(CANARY_AMOUNT)) {
    return {
      status: 'funding_required',
      address: account.address,
      testUsdcAtomicBalance: balance.toString(),
      faucet: CIRCLE_FAUCET_URL
    };
  }

  const result = await runX402Canary({
    payTo,
    signer: account,
    facilitator: createFacilitator(),
    settle: true
  });
  await writeFile(receiptFile, `${JSON.stringify(result.receipt, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600
  });
  return {
    status: result.receipt.settlement.status,
    receiptFile,
    receipt: result.receipt
  };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = parseOptions(args);
  let output;

  if (command === 'wallet-create') {
    output = await createWallet(options);
  } else if (command === 'preflight') {
    output = await preflight(options);
  } else if (command === 'run') {
    output = await executeCanary(options);
  } else {
    throw new Error('usage: wallet-create | preflight | run');
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (command === 'run' && output.status !== 'settled') {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: 'error', errorType: error.name })}\n`);
  process.exitCode = 1;
});
