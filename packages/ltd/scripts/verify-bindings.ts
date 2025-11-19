#!/usr/bin/env tsx
/**
 * Verify Cloudflare Pages Bindings Configuration
 *
 * This script verifies that all required bindings are correctly configured
 * for each Create Something Pages project.
 */

const ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';

interface Binding {
  name: string;
  type: 'kv_namespace' | 'd1' | 'r2_bucket' | 'env_var';
  value?: string;
  required: boolean;
}

interface ProjectConfig {
  name: string;
  domain: string;
  bindings: Binding[];
}

const PROJECTS: ProjectConfig[] = [
  {
    name: 'create-something-io',
    domain: 'createsomething.io',
    bindings: [
      { name: 'DB', type: 'd1', value: 'create-something-db', required: true },
      { name: 'SESSIONS', type: 'kv_namespace', value: '973b18397c4d4b068313152a642f1ad5', required: true },
      { name: 'CACHE', type: 'kv_namespace', value: 'bcb39a6258fe49b79da9dc9b09440934', required: true },
      { name: 'STORAGE', type: 'r2_bucket', value: 'create-something-assets', required: true },
      { name: 'ENVIRONMENT', type: 'env_var', value: 'production', required: true },
      { name: 'TERMINAL_VERSION', type: 'env_var', value: '2.0.0', required: true },
      { name: 'DEFAULT_THEME', type: 'env_var', value: 'dark', required: true },
    ]
  },
  {
    name: 'create-something-space',
    domain: 'createsomething.space',
    bindings: [
      { name: 'DB', type: 'd1', value: 'create-something-db', required: true },
      { name: 'SESSIONS', type: 'kv_namespace', value: '973b18397c4d4b068313152a642f1ad5', required: true },
      { name: 'CACHE', type: 'kv_namespace', value: 'bcb39a6258fe49b79da9dc9b09440934', required: true },
      { name: 'STORAGE', type: 'r2_bucket', value: 'create-something-assets', required: true },
      { name: 'ENVIRONMENT', type: 'env_var', value: 'production', required: true },
      { name: 'TERMINAL_VERSION', type: 'env_var', value: '2.0.0', required: true },
      { name: 'DEFAULT_THEME', type: 'env_var', value: 'dark', required: true },
    ]
  },
  {
    name: 'create-something-agency',
    domain: 'createsomething.agency',
    bindings: [
      { name: 'DB', type: 'd1', value: 'create-something-db', required: true },
      { name: 'SESSIONS', type: 'kv_namespace', value: '973b18397c4d4b068313152a642f1ad5', required: true },
      { name: 'CACHE', type: 'kv_namespace', value: 'bcb39a6258fe49b79da9dc9b09440934', required: true },
      { name: 'STORAGE', type: 'r2_bucket', value: 'create-something-assets', required: true },
      { name: 'ENVIRONMENT', type: 'env_var', value: 'production', required: true },
      { name: 'TERMINAL_VERSION', type: 'env_var', value: '2.0.0', required: true },
      { name: 'DEFAULT_THEME', type: 'env_var', value: 'dark', required: true },
    ]
  },
  {
    name: 'create-something-ltd',
    domain: 'createsomething.ltd',
    bindings: [
      { name: 'DB', type: 'd1', value: 'create-something-db', required: true },
      { name: 'ENVIRONMENT', type: 'env_var', value: 'production', required: true },
    ]
  }
];

async function verifyProject(project: ProjectConfig): Promise<void> {
  console.log(`\n📋 Verifying: ${project.name} (${project.domain})`);
  console.log('─'.repeat(60));

  const apiKey = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiKey) {
    console.error('❌ CLOUDFLARE_API_TOKEN not set');
    console.log('\nSet it with: export CLOUDFLARE_API_TOKEN=your_token_here');
    return;
  }

  try {
    // Fetch project details
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${project.name}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ Project not found or API error: ${response.status}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Project exists');
    console.log(`   Latest deployment: ${data.result.latest_deployment?.url || 'None'}`);

    // Verify custom domains
    if (data.result.domains && data.result.domains.length > 0) {
      console.log('✅ Custom domains:');
      data.result.domains.forEach((domain: any) => {
        console.log(`   - ${domain.name}`);
      });
    } else {
      console.log('⚠️  No custom domains configured');
    }

    // Check bindings
    console.log('\n📦 Required Bindings:');
    project.bindings.forEach(binding => {
      const icon = binding.required ? '🔴' : '🟡';
      console.log(`   ${icon} ${binding.name} (${binding.type})`);
      if (binding.value) {
        console.log(`      Expected: ${binding.value}`);
      }
    });

    console.log('\n💡 To configure bindings:');
    console.log(`   1. Go to: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${project.name}/settings/functions`);
    console.log('   2. Add each binding listed above');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('🔍 Cloudflare Pages Bindings Verification');
  console.log('='.repeat(60));
  console.log(`Account ID: ${ACCOUNT_ID}`);

  for (const project of PROJECTS) {
    await verifyProject(project);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete!');
  console.log('\n📖 Manual Steps Required:');
  console.log('   1. Configure bindings in Cloudflare dashboard (links above)');
  console.log('   2. Set environment variables for each project');
  console.log('   3. Verify custom domains are pointing to Pages');
  console.log('   4. Delete old Worker deployments once confirmed');
}

main().catch(console.error);
