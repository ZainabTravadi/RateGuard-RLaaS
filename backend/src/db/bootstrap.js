import { db } from "./index.js";

/**
 * Ensure required tables exist.
 * This is idempotent and runs on startup to protect older databases.
 */
export async function ensureDatabase() {
  const client = await db.connect();

  try {
    console.log("Ensuring all required tables exist...");
    await client.query("BEGIN");

    // UUID support for generated primary keys
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // ========== CORE USERS TABLE ==========
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));`);

    // ========== RATE LIMITING ENTITIES ==========
    // Environments/Services
    await client.query(`
      CREATE TABLE IF NOT EXISTS environments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_environments_user ON environments(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_environments_user_active ON environments(user_id, is_active);`);

    // API Keys
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        environment text NOT NULL,
        key_prefix text,
        key_hash text NOT NULL,
        name text,
        is_revoked boolean NOT NULL DEFAULT false,
        last_used timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_created ON api_keys(created_at);`);

    // Rate Limit Rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        environment_id uuid REFERENCES environments(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        limit_count integer NOT NULL,
        window_seconds integer NOT NULL,
        scope text NOT NULL CHECK (scope IN ('global', 'endpoint', 'identifier')),
        endpoint text,
        method text,
        strategy text DEFAULT 'sliding-window',
        enabled boolean NOT NULL DEFAULT true,
        priority integer DEFAULT 100,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_user ON rate_limit_rules(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_env ON rate_limit_rules(environment_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rate_limit_rules(user_id, enabled);`);

    // API Usage Logs (for analytics/auditing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_key_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        method text NOT NULL,
        endpoint text NOT NULL,
        status_code integer NOT NULL,
        ip_address text,
        rule_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_key_logs(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_key_logs(api_key_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_key_logs(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_user_created ON api_key_logs(user_id, created_at DESC);`);

    // ========== WORKSPACE/TEAM TABLES (LEGACY) ==========
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (workspace_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspace_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
        invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        is_read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        otp text NOT NULL,
        expires_at timestamptz NOT NULL,
        is_used boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // ========== HELPFUL INDEXES ==========
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(lower(email));`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invites_pending ON workspace_invites(workspace_id, lower(email)) WHERE status = 'pending';`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_created ON password_resets(created_at);`);

    await client.query("COMMIT");
    console.log("✅ All required tables are ready.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to ensure database tables:", err);
    throw err;
  } finally {
    client.release();
  }
}
