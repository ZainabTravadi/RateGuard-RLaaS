import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { db } from "./index.js";
import { MigrationError } from "../errors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

function checksumSource(source) {
  return crypto.createHash("sha256").update(source).digest("hex");
}

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      rolled_back_at timestamptz
    );
  `);
}

async function loadMigrationFiles() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));

  const migrations = [];
  for (const file of files) {
    const absolutePath = path.join(migrationsDir, file);
    const source = await fs.readFile(absolutePath, "utf8");
    const mod = await import(pathToFileURL(absolutePath).href);
    if (!mod?.name || typeof mod.up !== "function" || typeof mod.down !== "function") {
      throw new MigrationError(`Invalid migration module "${file}".`, {
        details: { file },
        documentationURL: "https://rateguard.dev/docs/migrations",
      });
    }
    migrations.push({
      version: file.split("_")[0],
      name: mod.name,
      file,
      checksum: checksumSource(source),
      up: mod.up,
      down: mod.down,
    });
  }
  return migrations;
}

export async function getMigrationStatus() {
  const client = await db.connect();
  try {
    await ensureSchemaMigrationsTable(client);
    const [appliedRows, migrations] = await Promise.all([
      client.query(`SELECT version, name, checksum, applied_at, rolled_back_at FROM schema_migrations ORDER BY version ASC`),
      loadMigrationFiles(),
    ]);

    const applied = new Map(appliedRows.rows.map((row) => [row.version, row]));
    return migrations.map((migration) => ({
      ...migration,
      applied: applied.has(migration.version),
      appliedAt: applied.get(migration.version)?.applied_at ?? null,
      rolledBackAt: applied.get(migration.version)?.rolled_back_at ?? null,
    }));
  } finally {
    client.release();
  }
}

export async function migrateUp(targetVersion = null) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureSchemaMigrationsTable(client);
    const migrations = await loadMigrationFiles();
    const appliedRows = await client.query(`SELECT version, checksum FROM schema_migrations ORDER BY version ASC`);
    const applied = new Map(appliedRows.rows.map((row) => [row.version, row]));

    for (const migration of migrations) {
      if (targetVersion && migration.version > targetVersion) {
        break;
      }

      const existing = applied.get(migration.version);
      if (existing) {
        if (existing.checksum !== migration.checksum) {
          throw new MigrationError(`Checksum mismatch for applied migration ${migration.version}.`, {
            details: { version: migration.version, expected: existing.checksum, actual: migration.checksum },
            documentationURL: "https://rateguard.dev/docs/migrations",
          });
        }
        continue;
      }

      await migration.up(client);
      await client.query(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)`,
        [migration.version, migration.name, migration.checksum]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error instanceof MigrationError ? error : new MigrationError("Failed to apply migrations.", {
      cause: error,
      details: { cause: error instanceof Error ? error.message : String(error) },
      documentationURL: "https://rateguard.dev/docs/migrations",
    });
  } finally {
    client.release();
  }
}

export async function migrateDown(steps = 1) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureSchemaMigrationsTable(client);
    const migrations = await loadMigrationFiles();
    const appliedRows = await client.query(`SELECT version FROM schema_migrations ORDER BY version DESC`);
    const appliedVersions = appliedRows.rows.map((row) => row.version);

    const count = Math.min(steps, appliedVersions.length);
    for (let index = 0; index < count; index += 1) {
      const version = appliedVersions[index];
      const migration = migrations.find((entry) => entry.version === version);
      if (!migration) {
        throw new MigrationError(`Migration file for version ${version} is missing.`, {
          details: { version },
          documentationURL: "https://rateguard.dev/docs/migrations",
        });
      }

      await migration.down(client);
      await client.query(
        `DELETE FROM schema_migrations WHERE version = $1`,
        [version]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error instanceof MigrationError ? error : new MigrationError("Failed to roll back migrations.", {
      cause: error,
      details: { cause: error instanceof Error ? error.message : String(error) },
      documentationURL: "https://rateguard.dev/docs/migrations",
    });
  } finally {
    client.release();
  }
}

export async function validateSchema() {
  const client = await db.connect();
  const requiredTables = {
    users: ["id", "email", "password_hash", "created_at", "updated_at"],
    workspaces: ["id", "owner_id", "name", "created_at", "updated_at"],
    workspace_members: ["id", "workspace_id", "user_id", "role", "created_at"],
    workspace_invites: ["id", "workspace_id", "email", "role", "invited_by", "status", "created_at", "updated_at"],
    teams: ["id", "owner_id", "name", "created_at", "updated_at"],
    team_members: ["id", "team_id", "user_id", "role", "created_at"],
    environments: ["id", "user_id", "name", "base_url", "is_active", "created_at", "updated_at"],
    api_keys: ["id", "user_id", "environment", "key_prefix", "key_hash", "name", "is_revoked", "last_used_at", "created_at", "updated_at"],
    rate_limit_rules: ["id", "user_id", "environment_id", "name", "description", "limit_count", "window_seconds", "scope", "endpoint", "method", "strategy", "enabled", "priority", "created_at", "updated_at"],
    api_key_logs: ["id", "api_key_id", "user_id", "method", "endpoint", "status_code", "ip_address", "rule_id", "created_at"],
    notifications: ["id", "user_id", "type", "payload", "is_read", "created_at", "updated_at"],
    password_resets: ["id", "email", "otp", "expires_at", "is_used", "created_at"],
    schema_migrations: ["version", "name", "checksum", "applied_at", "rolled_back_at"],
  };

  try {
    for (const [table, columns] of Object.entries(requiredTables)) {
      const result = await client.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        `,
        [table]
      );
      const actual = new Set(result.rows.map((row) => row.column_name));
      for (const column of columns) {
        if (!actual.has(column)) {
          throw new MigrationError(`Missing required column ${table}.${column}.`, {
            details: { table, column },
            documentationURL: "https://rateguard.dev/docs/migrations",
          });
        }
      }
    }
  } finally {
    client.release();
  }
}

export async function ensureDatabase() {
  await migrateUp();
  await validateSchema();
}

async function runCli() {
  const command = process.argv[2] || "up";
  const steps = Number(process.argv[3] || 1);

  if (command === "up") {
    await migrateUp();
  } else if (command === "down") {
    await migrateDown(Number.isNaN(steps) ? 1 : steps);
  } else if (command === "status") {
    const status = await getMigrationStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  } else {
    throw new MigrationError(`Unknown migration command "${command}".`, {
      details: { command },
      documentationURL: "https://rateguard.dev/docs/migrations",
    });
  }

  console.log(`Migration command "${command}" completed successfully.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
