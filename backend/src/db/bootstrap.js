import { db } from "./index.js";

/**
 * Ensure required workspace-related tables exist.
 * This is idempotent and runs on startup to protect older databases.
 */
export async function ensureDatabase() {
  const client = await db.connect();

  try {
    console.log("Ensuring workspace tables exist...");
    await client.query("BEGIN");

    // UUID support for generated primary keys
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

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

    // Helpful indexes
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
    console.log("Workspace tables are ready.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to ensure workspace tables:", err);
    throw err;
  } finally {
    client.release();
  }
}
