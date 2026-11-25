#!/usr/bin/env node
/**
 * Builds the CLI and packs the install package that creators download:
 *
 *   node scripts/pack.mjs [output.tgz]
 *
 * Default output: ../worker/public/cli/wf-template-validate.tgz. The validation
 * worker serves that folder as static assets, and Wrangler runs this script
 * before `dev` and `deploy` (`build.command` in worker/wrangler.jsonc), so a
 * worker deploy always ships the CLI built from the same commit.
 *
 * The package holds dist/cli.js and a package.json with no scripts and no
 * dependencies. The repository README is for maintainers and is left out.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(process.argv[2] ?? join(cliDir, '../worker/public/cli/wf-template-validate.tgz'));
const pkg = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8'));

// On Windows, pnpm and npm are .cmd files, which need a shell.
const shell = process.platform === 'win32';

execFileSync('pnpm', ['run', 'build'], { cwd: cliDir, stdio: 'inherit', shell });

const stage = mkdtempSync(join(tmpdir(), 'wf-template-validate-'));
try {
	mkdirSync(join(stage, 'dist'));
	copyFileSync(join(cliDir, 'dist/cli.js'), join(stage, 'dist/cli.js'));
	writeFileSync(
		join(stage, 'package.json'),
		`${JSON.stringify(
			{
				name: pkg.name,
				version: pkg.version,
				description: pkg.description,
				type: pkg.type,
				bin: pkg.bin,
				files: pkg.files,
				engines: pkg.engines
			},
			null,
			'\t'
		)}\n`
	);
	const [{ filename }] = JSON.parse(
		execFileSync('npm', ['pack', '--json', '--pack-destination', stage], { cwd: stage, encoding: 'utf8', shell })
	);
	mkdirSync(dirname(outFile), { recursive: true });
	copyFileSync(join(stage, filename), outFile);
} finally {
	rmSync(stage, { recursive: true, force: true });
}

console.log(`Packed ${pkg.name}@${pkg.version} -> ${outFile}`);
