#!/usr/bin/env node

/**
 * Fix Voucher Duplicates
 *
 * Resolves race condition that assigned the same vouchers to multiple partners.
 * Identifies duplicates, determines who keeps (newest partner), reassigns others.
 *
 * Usage:
 *   AIRTABLE_PAT=xxx node scripts/fix-voucher-duplicates.mjs [options]
 *
 * Options:
 *   --dry-run     Show what would be done without making changes
 *
 * Canon: The tool recedes; the work remains.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BASE_ID = 'appmKPhO5E12ueh41';
const PARTNERS_TABLE = 'Partners';
const VOUCHERS_TABLE = 'Vouchers';
const UNPROCESSED_STATUS_ID = 'selRG8F1KL16bquOr';
const ASSIGNED_STATUS_ID = 'selIaPcERUUlgHlYY';

const API_BASE = `https://api.airtable.com/v0/${BASE_ID}`;
const PAT = process.env.AIRTABLE_PAT;

const DRY_RUN = process.argv.includes('--dry-run');

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function airtableFetch(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function fetchAllRecords(table, fields = []) {
  const records = [];
  let offset = null;

  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    fields.forEach(f => params.append('fields[]', f));

    const query = params.toString();
    const data = await airtableFetch(`${table}${query ? `?${query}` : ''}`);
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  if (!PAT) {
    console.error('Error: AIRTABLE_PAT environment variable required');
    process.exit(1);
  }

  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== FIXING VOUCHER DUPLICATES ===');
  console.log('');

  // 1. Fetch all partners with vouchers
  console.log('Fetching partners...');
  const partners = await fetchAllRecords(PARTNERS_TABLE, ['Partner Contact', 'Vouchers']);
  console.log(`  Found ${partners.length} partners`);

  // 2. Build voucher -> partners map
  const voucherToPartners = new Map();

  for (const partner of partners) {
    const vouchers = partner.fields.Vouchers || [];
    const email = partner.fields['Partner Contact'];
    const createdTime = new Date(partner.createdTime);

    for (const voucherId of vouchers) {
      const id = typeof voucherId === 'string' ? voucherId : voucherId.id;
      if (!voucherToPartners.has(id)) {
        voucherToPartners.set(id, []);
      }
      voucherToPartners.get(id).push({
        partnerId: partner.id,
        email,
        createdTime,
      });
    }
  }

  // 3. Find duplicates (vouchers with multiple partners)
  const duplicates = [];
  for (const [voucherId, partnerList] of voucherToPartners) {
    if (partnerList.length > 1) {
      duplicates.push({ voucherId, partners: partnerList });
    }
  }

  if (duplicates.length === 0) {
    console.log('\nNo duplicate voucher assignments found!');
    return;
  }

  console.log(`\nFound ${duplicates.length} vouchers assigned to multiple partners:`);

  // Group duplicates by voucher pairs (since partners get 2 vouchers each)
  const partnerDuplicateMap = new Map();

  for (const { voucherId, partners: partnerList } of duplicates) {
    // Sort by created time, newest first (they keep the vouchers)
    partnerList.sort((a, b) => b.createdTime - a.createdTime);

    const keeper = partnerList[0];
    const needsReassignment = partnerList.slice(1);

    console.log(`  Voucher ${voucherId}:`);
    console.log(`    Keeps: ${keeper.email} (created ${keeper.createdTime.toISOString()})`);
    for (const p of needsReassignment) {
      console.log(`    Reassign: ${p.email} (created ${p.createdTime.toISOString()})`);

      // Track unique partners that need reassignment
      if (!partnerDuplicateMap.has(p.partnerId)) {
        partnerDuplicateMap.set(p.partnerId, {
          partnerId: p.partnerId,
          email: p.email,
          duplicateVouchers: [],
        });
      }
      partnerDuplicateMap.get(p.partnerId).duplicateVouchers.push(voucherId);
    }
  }

  const partnersToReassign = Array.from(partnerDuplicateMap.values());
  const vouchersNeeded = partnersToReassign.length * 2;

  console.log(`\n${partnersToReassign.length} partners need voucher reassignment (${vouchersNeeded} vouchers needed)`);

  // 4. Get available vouchers
  console.log('\nFetching available vouchers...');
  const allVouchers = await fetchAllRecords(VOUCHERS_TABLE, ['Voucher Code', 'Voucher Status', 'Partners']);

  const availableVouchers = allVouchers.filter(v => {
    const status = v.fields['Voucher Status'];
    const partners = v.fields.Partners;
    // Voucher Status is a string, not an object
    return status === 'Unprocessed' && (!partners || partners.length === 0);
  });

  console.log(`  Found ${availableVouchers.length} available vouchers`);

  if (availableVouchers.length < vouchersNeeded) {
    console.error(`\nError: Not enough vouchers! Need ${vouchersNeeded}, have ${availableVouchers.length}`);
    process.exit(1);
  }

  // 5. Execute reassignments
  console.log('\n=== REASSIGNMENT PLAN ===');

  let voucherIndex = 0;
  const reassignmentPlan = [];

  for (const { partnerId, email, duplicateVouchers } of partnersToReassign) {
    const newVouchers = [
      availableVouchers[voucherIndex++],
      availableVouchers[voucherIndex++],
    ];

    reassignmentPlan.push({
      partnerId,
      email,
      oldVouchers: duplicateVouchers,
      newVouchers: newVouchers.map(v => ({
        id: v.id,
        code: v.fields['Voucher Code'],
      })),
    });

    console.log(`\n${email}:`);
    console.log(`  Remove: ${duplicateVouchers.join(', ')}`);
    console.log(`  Assign: ${newVouchers.map(v => v.fields['Voucher Code']).join(', ')}`);
  }

  if (DRY_RUN) {
    console.log('\n=== DRY RUN COMPLETE (no changes made) ===');
    return;
  }

  // Execute the reassignments
  console.log('\n=== EXECUTING REASSIGNMENTS ===');

  for (const { partnerId, email, newVouchers } of reassignmentPlan) {
    console.log(`\nProcessing ${email}...`);

    // Update partner's vouchers - use string array format for linked records
    const voucherIds = newVouchers.map(v => v.id);
    console.log(`  Linking vouchers: ${voucherIds.join(', ')}`);

    const partnerUpdate = await airtableFetch(`${PARTNERS_TABLE}/${partnerId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          Vouchers: voucherIds,
        },
      }),
    });
    console.log(`  Updated partner record`);

    // Update each voucher's status to Assigned
    for (const voucher of newVouchers) {
      await airtableFetch(`${VOUCHERS_TABLE}/${voucher.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            'Voucher Status': 'Assigned',
            'Partners': [partnerId],
          },
        }),
      });
      console.log(`  Updated voucher ${voucher.code} status to Assigned`);
    }
  }

  // 6. Verify no duplicates remain
  console.log('\n=== VERIFICATION ===');

  const verifyPartners = await fetchAllRecords(PARTNERS_TABLE, ['Partner Contact', 'Vouchers']);
  const verifyMap = new Map();

  for (const partner of verifyPartners) {
    const vouchers = partner.fields.Vouchers || [];
    for (const voucherId of vouchers) {
      const id = typeof voucherId === 'string' ? voucherId : voucherId.id;
      if (!verifyMap.has(id)) {
        verifyMap.set(id, []);
      }
      verifyMap.get(id).push(partner.fields['Partner Contact']);
    }
  }

  const remainingDuplicates = Array.from(verifyMap.entries())
    .filter(([_, partners]) => partners.length > 1);

  if (remainingDuplicates.length === 0) {
    console.log('SUCCESS: No duplicate voucher assignments remain!');
  } else {
    console.error(`WARNING: ${remainingDuplicates.length} duplicates still exist:`);
    for (const [voucherId, partners] of remainingDuplicates) {
      console.error(`  ${voucherId}: ${partners.join(', ')}`);
    }
  }

  console.log('\n=== COMPLETE ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
