import { cpSync, existsSync, lstatSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const rootIndex = args.indexOf('--matraix-root');
const dryRun = args.includes('--dry-run');

if (rootIndex === -1 || !args[rootIndex + 1]) {
  throw new Error('Usage: node install-matraix-task.mjs --matraix-root /absolute/path/to/MatrAIx-Persona-8B [--dry-run]');
}

const source = resolve(import.meta.dirname, 'task');
const environmentSource = resolve(import.meta.dirname, 'environment');
const matraixRoot = resolve(args[rootIndex + 1]);
const taskRoot = resolve(matraixRoot, 'application/tasks');
const destination = resolve(taskRoot, 'local-buyer-readiness-intent');
const environmentDestination = resolve(
  matraixRoot,
  'environment/task-environments/application/local-buyer-readiness-bridge'
);

if (!existsSync(resolve(matraixRoot, 'pyproject.toml')) || !existsSync(taskRoot)) {
  throw new Error(`${matraixRoot} does not look like a MatrAIx checkout`);
}
if (!destination.startsWith(`${taskRoot}/`)) {
  throw new Error('Refusing to copy outside the MatrAIx application/tasks directory');
}
if (existsSync(destination) || existsSync(environmentDestination)) {
  throw new Error(`${destination} or ${environmentDestination} already exists; choose a fresh MatrAIx checkout`);
}

console.log(`${dryRun ? 'Would copy' : 'Copying'} task ${source} to ${destination}`);
console.log(`${dryRun ? 'Would copy' : 'Copying'} environment ${environmentSource} to ${environmentDestination}`);
if (!dryRun) {
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, errorOnExist: true });
  mkdirSync(dirname(environmentDestination), { recursive: true });
  cpSync(environmentSource, environmentDestination, { recursive: true, errorOnExist: true });
  if (!lstatSync(destination).isDirectory()) {
    throw new Error(`Expected task directory at ${destination}`);
  }
}
