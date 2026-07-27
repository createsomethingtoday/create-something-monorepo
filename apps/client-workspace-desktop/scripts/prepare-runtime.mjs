import { execFileSync } from 'node:child_process';
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const resourcesRoot = join(appRoot, 'src-tauri', 'resources');
const outputRoot = join(repoRoot, 'output', 'client-workspace-desktop');
const trustRoot = join(outputRoot, 'trust');
const privateKeyPath = join(trustRoot, 'local-signing-private.pem');
const generatedPublicKeyPath = join(trustRoot, 'local-signing-public.pem');
const revokedPrivateKeyPath = join(trustRoot, 'local-revoked-private.pem');
const revokedPublicKeyPath = join(trustRoot, 'local-revoked-public.pem');
const releaseMode = process.env.CLIENT_WORKSPACE_RELEASE_MODE === 'production';
const managedKeyringPath = process.env.CLIENT_WORKSPACE_TRUST_KEYRING_FILE;

if (releaseMode && !managedKeyringPath) {
  throw new Error('Production runtime preparation requires CLIENT_WORKSPACE_TRUST_KEYRING_FILE.');
}

execFileSync('pnpm', ['--filter', '@create-something/client-workspace', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit'
});

rmSync(resourcesRoot, { recursive: true, force: true });
mkdirSync(join(resourcesRoot, 'runtime'), { recursive: true });
mkdirSync(join(resourcesRoot, 'trust'), { recursive: true });
cpSync(join(repoRoot, 'packages', 'client-workspace', 'build'), join(resourcesRoot, 'server'), {
  recursive: true
});
const removeSourceMaps = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) removeSourceMaps(path);
    else if (entry.name.endsWith('.map')) rmSync(path);
  }
};
removeSourceMaps(join(resourcesRoot, 'server'));

const bunPath =
  process.env.CLIENT_WORKSPACE_BUN_PATH ??
  (process.env.HOME ? join(process.env.HOME, '.bun', 'bin', 'bun') : '');
if (!bunPath || !existsSync(bunPath)) {
  throw new Error('Bundled runtime preparation requires Bun. Set CLIENT_WORKSPACE_BUN_PATH.');
}
const bundledBun = join(resourcesRoot, 'runtime', 'bun');
cpSync(bunPath, bundledBun);
chmodSync(bundledBun, 0o755);

mkdirSync(trustRoot, { recursive: true });
if (!releaseMode && !existsSync(privateKeyPath)) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), {
    mode: 0o600
  });
  writeFileSync(generatedPublicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), {
    mode: 0o644
  });
} else if (!releaseMode && !existsSync(generatedPublicKeyPath)) {
  const publicKey = createPublicKey(createPrivateKey(readFileSync(privateKeyPath)));
  writeFileSync(generatedPublicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), {
    mode: 0o644
  });
}
if (!releaseMode && !existsSync(revokedPrivateKeyPath)) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  writeFileSync(revokedPrivateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), {
    mode: 0o600
  });
  writeFileSync(revokedPublicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), {
    mode: 0o644
  });
} else if (!releaseMode && !existsSync(revokedPublicKeyPath)) {
  const publicKey = createPublicKey(createPrivateKey(readFileSync(revokedPrivateKeyPath)));
  writeFileSync(revokedPublicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), {
    mode: 0o644
  });
}
const bundledKeyring = join(resourcesRoot, 'trust', 'client-workspace-trust-keyring.json');
if (managedKeyringPath) {
  if (!existsSync(managedKeyringPath)) {
    throw new Error('Configured workspace trust keyring does not exist.');
  }
  cpSync(managedKeyringPath, bundledKeyring);
} else {
  const publicKeyPem = readFileSync(generatedPublicKeyPath, 'utf8');
  const revokedPublicKeyPem = readFileSync(revokedPublicKeyPath, 'utf8');
  writeFileSync(
    bundledKeyring,
    `${JSON.stringify(
      {
        schema: 'create-something/client-workspace-keyring@1',
        issuer: 'CREATE SOMETHING',
        appVersion: '0.2.0',
        allowLegacyV1: true,
        revokedKeyIds: ['local-revoked'],
        keys: [
          { keyId: 'local-verifier', publicKeyPem },
          { keyId: 'local-revoked', publicKeyPem: revokedPublicKeyPem }
        ]
      },
      null,
      2
    )}\n`,
    { mode: 0o644 }
  );
}

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
writeFileSync(
  join(resourcesRoot, 'runtime-build.json'),
  `${JSON.stringify(
    {
      schema: 'create-something/client-workspace-runtime@1',
      bunSha256: digest(bundledBun),
      trustKeyringSha256: digest(bundledKeyring),
      releaseMode
    },
    null,
    2
  )}\n`
);

console.log(`Prepared desktop runtime at ${resourcesRoot}`);
console.log(`Local fixture private key: ${privateKeyPath}`);
