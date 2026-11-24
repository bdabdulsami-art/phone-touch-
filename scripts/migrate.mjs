#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { del, list } from "@vercel/blob";
import { pendingMigrations } from "./migration-plan.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  client.on("notice", (notice) => {
    if (notice?.message) console.log(`[migrate] ${notice.message}`);
  });
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
    await purgeOrphanBlobs(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});

async function purgeOrphanBlobs(client) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.log("[blob] no token — skipping orphan purge");
    return;
  }
  const table = await client.query("select to_regclass('public._cleanup_blobs') as name");
  if (table.rows[0]?.name) {
    const queued = await client.query("select url from _cleanup_blobs");
    const urls = queued.rows.map((row) => row.url).filter((url) => typeof url === "string" && url);
    if (urls.length) {
      await del(urls, { token });
      await client.query("delete from _cleanup_blobs where url = any($1::text[])", [urls]);
      console.log(`[blob] deleted ${urls.length} queued image(s)`);
    }
  }
  const shops = await client.query("select id::text as id from shops");
  const ids = new Set(shops.rows.map((row) => row.id));
  const orphans = [];
  let cursor;
  do {
    const page = await list({ token, prefix: "shops/", limit: 1000, cursor });
    for (const blob of page.blobs) {
      const id = blob.pathname.split("/")[1];
      if (id && !ids.has(id)) orphans.push(blob.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  if (orphans.length) {
    await del(orphans, { token });
    console.log(`[blob] deleted ${orphans.length} orphan shop image(s)`);
  }
}

