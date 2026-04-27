/**
 * backfill-cf.ts
 *
 * Syncs Cloudflare Email Sending state → our database.
 *
 * What it does:
 *   1. Fetches every active zone from Cloudflare.
 *   2. For each zone, lists all Email Sending subdomains.
 *   3. Upserts them into the `domains` table:
 *        - Missing domain  → inserted with data from CF.
 *        - Existing domain → CF metadata refreshed (subdomain ID, DKIM
 *          selector, return-path domain, verified/enabled flag).
 *   4. Reports any DB domains whose CF subdomain can no longer be found.
 *   5. Prints per-domain send-count stats derived from `email_logs`.
 *
 * Usage:
 *   tsx src/scripts/backfill-cf.ts
 *   # or via npm:
 *   pnpm backfill
 */

import 'dotenv/config';
import { nanoid } from 'nanoid';
import { bootstrapSchema, domains, emailLogs } from '../db.js';
import { listAllZones, listSendingSubdomains } from '../services/cloudflare.js';
import { env } from '../env.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[backfill] ${msg}`);
}

function warn(msg: string) {
  console.warn(`[backfill] ⚠  ${msg}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    console.error('[backfill] CF_API_TOKEN and CF_ACCOUNT_ID must be set.');
    process.exit(1);
  }

  log('Bootstrapping schema…');
  await bootstrapSchema();

  // ── Step 1: collect every CF subdomain across all zones ──────────────────

  log('Fetching zones from Cloudflare…');
  const zones = await listAllZones();
  log(`Found ${zones.length} zone(s).`);

  // Map: subdomain name → { zone, cfSubdomain }
  const cfByName = new Map<
    string,
    { zoneId: string; zoneName: string; tag: string; enabled: boolean; dkimSelector: string | null; returnPathDomain: string | null }
  >();

  for (const zone of zones) {
    let subdomains;
    try {
      subdomains = await listSendingSubdomains(zone.id);
    } catch (err) {
      warn(`Could not list subdomains for zone ${zone.name}: ${(err as Error).message}`);
      continue;
    }
    for (const sd of subdomains) {
      cfByName.set(sd.name, {
        zoneId: zone.id,
        zoneName: zone.name,
        tag: sd.tag,
        enabled: sd.enabled,
        dkimSelector: sd.dkim_selector,
        returnPathDomain: sd.return_path_domain,
      });
    }
    if (subdomains.length > 0) {
      log(`  ${zone.name}: ${subdomains.length} sending subdomain(s)`);
    }
  }

  log(`Total CF sending subdomains found: ${cfByName.size}`);

  // ── Step 2: load existing DB domains ─────────────────────────────────────

  const dbDomains = await domains.find({});
  const dbByName = new Map(dbDomains.map((d) => [d.name, d]));

  // ── Step 3: upsert ────────────────────────────────────────────────────────

  let inserted = 0;
  let updated = 0;

  for (const [name, cf] of cfByName) {
    const existing = dbByName.get(name);

    if (!existing) {
      // Insert domain that exists in CF but not in our DB
      await domains.insert({
        id: nanoid(),
        name,
        cf_zone_id: cf.zoneId,
        cf_subdomain_id: cf.tag,
        dkim_selector: cf.dkimSelector,
        return_path_domain: cf.returnPathDomain,
        verified: cf.enabled ? 1 : 0,
        created_at: new Date().toISOString(),
      });
      log(`  + inserted  ${name}  (zone: ${cf.zoneName})`);
      inserted++;
    } else {
      // Update fields that may have drifted
      const needsUpdate =
        existing.cf_zone_id !== cf.zoneId ||
        existing.cf_subdomain_id !== cf.tag ||
        existing.dkim_selector !== cf.dkimSelector ||
        existing.return_path_domain !== cf.returnPathDomain ||
        (existing.verified === 0 && cf.enabled);

      if (needsUpdate) {
        await domains.update({
          where: { id: existing.id },
          set: {
            cf_zone_id: cf.zoneId,
            cf_subdomain_id: cf.tag,
            dkim_selector: cf.dkimSelector,
            return_path_domain: cf.returnPathDomain,
            // Only promote verified; never demote (so manual verifications survive).
            ...(cf.enabled && !existing.verified ? { verified: 1 } : {}),
          },
        });
        log(`  ~ refreshed ${name}`);
        updated++;
      } else {
        log(`  = in-sync   ${name}`);
      }
    }
  }

  // ── Step 4: orphaned DB domains ───────────────────────────────────────────

  const orphans = dbDomains.filter((d) => !cfByName.has(d.name));
  if (orphans.length > 0) {
    warn(`${orphans.length} domain(s) in DB not found in Cloudflare:`);
    for (const d of orphans) {
      warn(`  - ${d.name} (id: ${d.id})`);
    }
  }

  // ── Step 5: send-count stats from email_logs ──────────────────────────────

  log('');
  log('─── Send stats from email_logs ───────────────────────────────────────');

  // Reload domains after upserts
  const allDomains = await domains.find({});
  const domainNameById = new Map(allDomains.map((d) => [d.id, d.name]));

  // Aggregate: total, live, test counts per domain_id
  interface Stats { total: number; live: number; test: number }
  const stats = new Map<string | null, Stats>();

  const logs = await emailLogs.find({ where: { status: 'sent' } });

  for (const entry of logs) {
    const key = entry.domain_id;
    if (!stats.has(key)) stats.set(key, { total: 0, live: 0, test: 0 });
    const s = stats.get(key)!;
    s.total++;
    if (entry.is_test) s.test++; else s.live++;
  }

  if (stats.size === 0) {
    log('No sent emails recorded yet.');
  } else {
    const fmt = (label: string, s: Stats) =>
      `  ${label.padEnd(40)} total=${s.total}  live=${s.live}  test=${s.test}`;

    for (const [domainId, s] of stats) {
      const label = domainId
        ? (domainNameById.get(domainId) ?? `[unknown: ${domainId}]`)
        : '[no domain]';
      log(fmt(label, s));
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  log('');
  log(`Done.  inserted=${inserted}  refreshed=${updated}  orphaned=${orphans.length}`);
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
