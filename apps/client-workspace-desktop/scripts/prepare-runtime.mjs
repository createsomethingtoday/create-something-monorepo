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
if (!existsSync(privateKeyPath)) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), {
    mode: 0o600
  });
  writeFileSync(generatedPublicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), {
    mode: 0o644
  });
} else if (!existsSync(generatedPublicKeyPath)) {
  const publicKey = createPublicKey(createPrivateKey(readFileSync(privateKeyPath)));
  writeFileSync(generatedPublicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }), {
    mode: 0o644
  });
}
const publicKeyPath = process.env.CLIENT_WORKSPACE_TRUST_PUBLIC_KEY_FILE ?? generatedPublicKeyPath;
if (!existsSync(publicKeyPath))
  throw new Error('Configured workspace trust public key does not exist.');
cpSync(publicKeyPath, join(resourcesRoot, 'trust', 'client-workspace-signing-public.pem'));

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
writeFileSync(
  join(resourcesRoot, 'runtime-build.json'),
  `${JSON.stringify(
    {
      schema: 'create-something/client-workspace-runtime@1',
      bunSha256: digest(bundledBun),
      trustPublicKeySha256: digest(
        join(resourcesRoot, 'trust', 'client-workspace-signing-public.pem')
      )
    },
    null,
    2
  )}\n`
);

console.log(`Prepared desktop runtime at ${resourcesRoot}`);
console.log(`Local fixture private key: ${privateKeyPath}`);
