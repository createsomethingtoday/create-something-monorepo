#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scaffold } from './scaffold.mjs';
import { runDoctor } from './doctor.mjs';
import { EXAMPLE_LISTING, runListingKit } from './listing-kit.mjs';
import { buildPacket, writePacket } from './packet.mjs';
import { loadRegistry } from './lib/registry.mjs';
import { renderText, summarize } from './lib/report.mjs';

const USAGE = `wf-forge: build a Designer Extension that passes Marketplace review, and the packet to submit it.

  wf-forge new <dir> --name "Product Name" [--force]
  wf-forge doctor <project-dir> [--json]
  wf-forge listing <listing.json> [--json]
  wf-forge listing --example > listing.json
  wf-forge packet <project-dir> <listing.json> [--out <dir>]
  wf-forge registry [--json]

Doctor and listing exit 1 when a blocker or required finding is open.`;

const [, , command, ...rest] = process.argv;
const flags = parseFlags(rest);

try {
  switch (command) {
    case 'new': {
      const [dir] = flags._;
      if (!dir) fail('new needs a target directory.');
      const result = scaffold({ targetDir: dir, appName: flags.name, force: Boolean(flags.force) });
      console.log(`Scaffolded "${flags.name}" into ${result.target}`);
      console.log(`Filled placeholders in: ${result.filled.join(', ')}`);
      console.log('\nNext:\n  cd ' + dir + '\n  npm install\n  npm run dev        # load the Development URL in the Designer Apps panel\n  npm run build      # bundle.zip + review-artifacts/bundle.js.map\n  wf-forge doctor .  # before Preflight');
      break;
    }
    case 'doctor': {
      const [dir = '.'] = flags._;
      const result = runDoctor(dir);
      output('Doctor', result.findings, flags.json);
      process.exitCode = summarize(result.findings).ready ? 0 : 1;
      break;
    }
    case 'listing': {
      if (flags.example) {
        console.log(JSON.stringify(EXAMPLE_LISTING, null, 2));
        break;
      }
      const [file] = flags._;
      if (!file) fail('listing needs a listing.json path (or --example).');
      const result = runListingKit(file);
      output('Listing', result.findings, flags.json);
      process.exitCode = summarize(result.findings).ready ? 0 : 1;
      break;
    }
    case 'packet': {
      const [dir, file] = flags._;
      if (!dir || !file) fail('packet needs <project-dir> <listing.json>.');
      const packet = buildPacket({ projectDir: dir, listingPath: file });
      const out = flags.out || resolve(dir, 'submission-packet');
      const written = writePacket(packet, out);
      console.log(renderText('Packet', packet.findings));
      console.log(`\nWrote ${written.files.join(', ')} to ${written.out}`);
      console.log(`${packet.humanGates.length} human gates remain in CHECKLIST.md. This tool does not submit.`);
      process.exitCode = packet.summary.overall.ready ? 0 : 1;
      break;
    }
    case 'registry': {
      const reg = loadRegistry();
      if (flags.json) {
        console.log(JSON.stringify(reg, null, 2));
        break;
      }
      console.log(`Requirements registry ${reg.version} (${reg.scope}): ${reg.requirements.length} requirements`);
      const byProv = {};
      for (const r of reg.requirements) byProv[r.provenance] = (byProv[r.provenance] || 0) + 1;
      console.log(Object.entries(byProv).map(([k, v]) => `${k} ${v}`).join(', '));
      for (const r of reg.requirements) console.log(`  ${r.id.padEnd(26)} ${r.severity.padEnd(9)} ${r.provenance.padEnd(17)} ${r.enforcedBy.join(',')}`);
      break;
    }
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(USAGE);
      break;
    default:
      fail(`Unknown command "${command}".\n\n${USAGE}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}

function output(title, findings, asJson) {
  if (asJson) {
    console.log(JSON.stringify({ summary: summarize(findings), findings }, null, 2));
  } else {
    console.log(renderText(title, findings));
  }
}

function parseFlags(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else out[key] = true;
    } else out._.push(a);
  }
  return out;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

export { writeFileSync };
