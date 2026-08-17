import type { WorkerManifest } from '@notionhq/workers';
import { stableId } from './ids.js';

export type LocalBuildReceipt = {
  schema: 'create-something/notion-operator-playbook-receipt@1';
  receiptId: string;
  generatedAt: string;
  packageVersion: string;
  sdkVersion: string;
  capabilityKeys: string[];
  databaseKeys: string[];
  proofLevel: 'local-build-only';
  externalMutations: false;
  excluded: string[];
};

export function createLocalBuildReceipt(input: {
  manifest: WorkerManifest;
  packageVersion: string;
  generatedAt: string;
}): LocalBuildReceipt {
  const capabilityKeys = input.manifest.capabilities.map((item) => item.key).sort();
  const databaseKeys = input.manifest.databases.map((item) => item.key).sort();
  return {
    schema: 'create-something/notion-operator-playbook-receipt@1',
    receiptId: stableId('build', [
      input.packageVersion,
      input.manifest.sdkVersion,
      ...capabilityKeys,
      ...databaseKeys
    ]),
    generatedAt: input.generatedAt,
    packageVersion: input.packageVersion,
    sdkVersion: input.manifest.sdkVersion,
    capabilityKeys,
    databaseKeys,
    proofLevel: 'local-build-only',
    externalMutations: false,
    excluded: [
      'Notion-as-Code apply',
      'hosted Worker deployment',
      'secret or OAuth configuration',
      'Custom Agent attachment',
      'Notion workspace mutation'
    ]
  };
}
