/**
 * RECONCILE VERIFIED PHONE NUMBERS INTO WHATSAPP PHONE REGISTRY
 *
 * Scans the `users` collection in Firestore paginated and reconciles all verified WhatsApp
 * numbers into `whatsapp_phone_registry` (`phone_{normWaId}`).
 *
 * Safety Rules:
 * 1. Default mode is DRY-RUN (zero writes to Firestore).
 * 2. Does NOT rely only on memory cache; scans full collection.
 * 3. International phone normalization (E.164 without '+').
 * 4. Preserves existing correct registry owner.
 * 5. Flags duplicate verified phone owners as conflicts; does NOT automatically pick a winner.
 * 6. Flags missing or invalid phone numbers.
 * 7. Strictly idempotent.
 *
 * Usage:
 *   node scripts/reconcile_phone_registry.cjs            (Dry run)
 *   node scripts/reconcile_phone_registry.cjs --dry-run  (Explicit dry run)
 *   node scripts/reconcile_phone_registry.cjs --apply    (Live apply - restricted in test phase)
 */

const { normalizeToWaId } = require('../whatsapp_integration.ts');

const maskPhone = (phone) => {
  const str = String(phone || '').trim();
  if (!str) return '[none]';
  if (str.length <= 4) return '***';
  return `...${str.slice(-4)}`;
};

const maskEmail = (email) => {
  const str = String(email || '').trim().toLowerCase();
  if (!str) return '[none]';
  const parts = str.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;
  return `${maskedName}@${domain}`;
};

async function runReconciliation(options = {}) {
  const isApply = Boolean(options.apply || process.argv.includes('--apply'));
  const isDryRun = !isApply || Boolean(options.dryRun || process.argv.includes('--dry-run'));

  console.log('================================================================');
  console.log('📋 WHATSAPP VERIFIED PHONE REGISTRY RECONCILIATION');
  console.log(`🔒 Mode: ${isDryRun ? 'DRY-RUN (Simulated, NO writes)' : 'LIVE APPLY (Writes enabled)'}`);
  console.log('================================================================\n');

  // Obtain database service
  let centralDb = options.centralDb;
  if (!centralDb) {
    try {
      const serviceMod = require('../firestore_database_service.cjs');
      centralDb = serviceMod.centralDb;
      if (typeof centralDb.setUseFirestore === 'function') {
        centralDb.setUseFirestore(true);
      }
      if (typeof centralDb.init === 'function') {
        await centralDb.init();
      }
    } catch (e) {
      console.error('❌ Failed to load firestore_database_service.cjs:', e.message);
      return { success: false, error: 'DB_INIT_FAILED' };
    }
  }

  const stats = {
    totalUsersScanned: 0,
    verifiedPhoneUsers: 0,
    newEntriesProposed: 0,
    existingEntriesPreserved: 0,
    duplicateOwnershipConflicts: 0,
    registryMismatchConflicts: 0,
    invalidPhoneNumbers: 0,
    missingPhoneNumbers: 0,
    recordsRequiringManualReview: 0,
  };

  const conflictDetails = [];
  const invalidDetails = [];
  const proposedWrites = [];
  const preservedDetails = [];

  // Step 1: Read all users paginated
  console.log('⏳ Scanning `users` collection in paginated batches...');
  let allUsers = [];

  try {
    if (centralDb.listDocs) {
      const res = await centralDb.listDocs('users', 100);
      if (res && res.success && Array.isArray(res.documents)) {
        allUsers = res.documents;
      }
    } else if (centralDb.cache?.users) {
      allUsers = Array.from(centralDb.cache.users.values());
    }
  } catch (err) {
    console.error('❌ Error reading users collection:', err.message);
    return { success: false, error: 'USERS_READ_FAILED', details: err.message };
  }

  stats.totalUsersScanned = allUsers.length;
  console.log(`✅ Loaded ${stats.totalUsersScanned} user documents.\n`);

  // Step 2: Filter and group verified users by normalized phone number
  const phoneToUsersMap = new Map(); // normalizedPhone -> Array<{ email, rawPhone, countryCode, user }>

  for (const u of allUsers) {
    if (!u) continue;
    const email = String(u.email || u.id || '').toLowerCase().trim();
    if (!email) continue;

    const isVerified = Boolean(
      u.whatsappVerified ||
      u.primaryMobileVerified ||
      (u.whatsappLinkStatus === 'linked' && u.linkedWhatsAppWaId)
    );

    if (!isVerified) continue;
    stats.verifiedPhoneUsers++;

    const countryCode = String(u.countryCode || '+91').trim();
    const rawPhone = String(
      u.linkedWhatsAppWaId ||
      u.whatsappNumber ||
      u.primaryNumber ||
      u.mobileNumber ||
      u.primaryPhone ||
      u.mobile ||
      ''
    ).trim();

    if (!rawPhone) {
      stats.missingPhoneNumbers++;
      stats.recordsRequiringManualReview++;
      invalidDetails.push({ email, reason: 'missing_phone', rawPhone: '' });
      continue;
    }

    const normWa = normalizeToWaId(rawPhone, countryCode);

    // Validate normalized phone format (must be 10-15 digits)
    if (!normWa || normWa.length < 10 || normWa.length > 15 || !/^\d+$/.test(normWa)) {
      stats.invalidPhoneNumbers++;
      stats.recordsRequiringManualReview++;
      invalidDetails.push({ email, reason: 'invalid_format', rawPhone, normalized: normWa });
      continue;
    }

    if (!phoneToUsersMap.has(normWa)) {
      phoneToUsersMap.set(normWa, []);
    }
    phoneToUsersMap.get(normWa).push({
      email,
      rawPhone,
      countryCode,
      user: u,
    });
  }

  // Step 3: Evaluate each unique normalized phone
  for (const [normPhone, owners] of phoneToUsersMap.entries()) {
    const registryDocId = `phone_${normPhone}`;

    // Conflict Check 1: Multiple verified users claiming same phone number in legacy data
    if (owners.length > 1) {
      stats.duplicateOwnershipConflicts += owners.length;
      stats.recordsRequiringManualReview += owners.length;
      conflictDetails.push({
        type: 'DUPLICATE_LEGACY_OWNERSHIP',
        normalizedPhone: normPhone,
        competingEmails: owners.map((o) => o.email),
        recommendation: 'Manual identity review required; registry NOT modified automatically.',
      });
      continue;
    }

    const singleOwner = owners[0];
    const targetEmail = singleOwner.email;

    // Check existing registry entry in Firestore
    let existingReg = null;
    try {
      if (centralDb.readDoc) {
        const readRes = await centralDb.readDoc('whatsapp_phone_registry', registryDocId);
        if (readRes && readRes.success && readRes.data) {
          existingReg = readRes.data;
        }
      }
    } catch (e) {
      console.warn(`[Warning] Could not read registry doc ${registryDocId}:`, e.message);
    }

    if (existingReg && existingReg.status === 'active') {
      const regOwner = String(existingReg.verifiedEmail || '').toLowerCase().trim();
      if (regOwner === targetEmail) {
        // Correct owner already in registry
        stats.existingEntriesPreserved++;
        preservedDetails.push({ normalizedPhone: normPhone, email: targetEmail });
      } else {
        // Conflict Check 2: Registry owned by one user, but user doc verified by another
        stats.registryMismatchConflicts++;
        stats.recordsRequiringManualReview++;
        conflictDetails.push({
          type: 'REGISTRY_MISMATCH',
          normalizedPhone: normPhone,
          registryOwner: regOwner,
          userClaimant: targetEmail,
          recommendation: 'Ownership collision between registry and user profile. Manual review required.',
        });
      }
      continue;
    }

    // New registry entry proposed
    stats.newEntriesProposed++;
    const proposedDoc = {
      normalizedPhone: normPhone,
      cleanPhone: singleOwner.rawPhone.replace(/\D/g, '').slice(-10),
      countryCode: singleOwner.countryCode.startsWith('+') ? singleOwner.countryCode : `+${singleOwner.countryCode}`,
      verifiedEmail: targetEmail,
      verifiedAt: singleOwner.user.whatsappVerifiedAt || Date.now(),
      status: 'active',
      source: 'reconciliation_backfill',
      updatedAt: Date.now(),
    };

    proposedWrites.push({
      docId: registryDocId,
      email: targetEmail,
      phone: normPhone,
      data: proposedDoc,
    });
  }

  // Step 4: Live Apply writes (if --apply and NOT dry-run)
  let appliedWrites = 0;
  if (!isDryRun && isApply) {
    console.log(`\n⚡ Applying ${proposedWrites.length} proposed writes to whatsapp_phone_registry...`);
    for (const item of proposedWrites) {
      try {
        await centralDb.writeDoc('whatsapp_phone_registry', item.docId, item.data);
        appliedWrites++;
      } catch (wErr) {
        console.error(`❌ Failed to write registry doc ${item.docId}:`, wErr.message);
      }
    }
    console.log(`✅ Applied ${appliedWrites} / ${proposedWrites.length} writes successfully.`);
  }

  // Step 5: Output Audit Summary Report
  console.log('\n================================================================');
  console.log('📊 RECONCILIATION AUDIT SUMMARY REPORT');
  console.log('================================================================');
  console.log(`  Total Users Scanned:               ${stats.totalUsersScanned}`);
  console.log(`  Verified Phone Users:              ${stats.verifiedPhoneUsers}`);
  console.log(`  New Registry Entries Proposed:     ${stats.newEntriesProposed}`);
  console.log(`  Existing Registry Entries Preserved:${stats.existingEntriesPreserved}`);
  console.log(`  Duplicate Ownership Conflicts:     ${stats.duplicateOwnershipConflicts}`);
  console.log(`  Registry Mismatch Conflicts:       ${stats.registryMismatchConflicts}`);
  console.log(`  Invalid Phone Numbers:             ${stats.invalidPhoneNumbers}`);
  console.log(`  Missing Phone Numbers:             ${stats.missingPhoneNumbers}`);
  console.log(`  Records Requiring Manual Review:   ${stats.recordsRequiringManualReview}`);
  console.log(`  Live Writes Executed:              ${isDryRun ? '0 (DRY-RUN)' : appliedWrites}`);
  console.log('================================================================\n');

  if (conflictDetails.length > 0) {
    console.log('⚠️ CONFLICTS REQUIRING MANUAL REVIEW:');
    conflictDetails.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.type}] Phone: ${maskPhone(c.normalizedPhone)}`);
      if (c.competingEmails) console.log(`     Claimants: ${c.competingEmails.map(maskEmail).join(', ')}`);
      if (c.registryOwner) console.log(`     Registry Owner: ${maskEmail(c.registryOwner)} vs Claimant: ${maskEmail(c.userClaimant)}`);
      console.log(`     Action: ${c.recommendation}`);
    });
    console.log('');
  }

  if (invalidDetails.length > 0) {
    console.log('⚠️ INVALID OR MISSING PHONE NUMBERS:');
    invalidDetails.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. User: ${maskEmail(inv.email)} - Reason: ${inv.reason} (Raw: "${maskPhone(inv.rawPhone)}")`);
    });
    console.log('');
  }

  return {
    success: true,
    isDryRun,
    stats,
    conflictDetails,
    invalidDetails,
    proposedWrites,
    preservedDetails,
  };
}

// CLI Execution guard
if (require.main === module) {
  runReconciliation()
    .then((result) => {
      if (!result.success) process.exit(1);
    })
    .catch((err) => {
      console.error('Fatal reconciliation error:', err);
      process.exit(1);
    });
}

module.exports = { runReconciliation };
