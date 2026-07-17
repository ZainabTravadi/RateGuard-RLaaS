export const name = "0001_create_core_schema";

export async function up(client) {
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (team_id, user_id)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS environments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      base_url text NOT NULL DEFAULT '',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      environment text NOT NULL,
      key_prefix text NOT NULL,
      key_hash text NOT NULL,
      name text,
      is_revoked boolean NOT NULL DEFAULT false,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS rate_limit_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      environment_id uuid REFERENCES environments(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      limit_count integer NOT NULL CHECK (limit_count > 0),
      window_seconds integer NOT NULL CHECK (window_seconds > 0),
      scope text NOT NULL CHECK (scope IN ('global', 'endpoint', 'identifier')),
      endpoint text,
      method text,
      strategy text NOT NULL DEFAULT 'sliding-window',
      enabled boolean NOT NULL DEFAULT true,
      priority integer NOT NULL DEFAULT 100,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

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

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type text NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      rolled_back_at timestamptz
    );
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON workspace_invites(lower(email));`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invites_pending ON workspace_invites(workspace_id, lower(email)) WHERE status = 'pending';`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_environments_user ON environments(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_environments_user_active ON environments(user_id, is_active);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_created ON api_keys(created_at);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_user ON rate_limit_rules(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_env ON rate_limit_rules(environment_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rate_limit_rules(user_id, enabled);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_key_logs(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_key_logs(api_key_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_key_logs(created_at);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_user_created ON api_key_logs(user_id, created_at DESC);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_created ON password_resets(created_at);`);
}

export async function down(client) {
  await client.query(`DROP TABLE IF EXISTS schema_migrations`);
  await client.query(`DROP TABLE IF EXISTS api_key_logs`);
  await client.query(`DROP TABLE IF EXISTS rate_limit_rules`);
  await client.query(`DROP TABLE IF EXISTS api_keys`);
  await client.query(`DROP TABLE IF EXISTS notifications`);
  await client.query(`DROP TABLE IF EXISTS password_resets`);
  await client.query(`DROP TABLE IF EXISTS environments`);
  await client.query(`DROP TABLE IF EXISTS team_members`);
  await client.query(`DROP TABLE IF EXISTS teams`);
  await client.query(`DROP TABLE IF EXISTS workspace_invites`);
  await client.query(`DROP TABLE IF EXISTS workspace_members`);
  await client.query(`DROP TABLE IF EXISTS workspaces`);
  await client.query(`DROP TABLE IF EXISTS users`);
}

