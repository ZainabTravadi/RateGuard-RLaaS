export const name = "0002_harden_existing_schema";

export async function up(client) {
  await client.query(`ALTER TABLE environments ADD COLUMN IF NOT EXISTS base_url text NOT NULL DEFAULT ''`);
  await client.query(`ALTER TABLE environments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production'`);
  await client.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix text NOT NULL DEFAULT ''`);
  await client.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at timestamptz`);
  await client.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`ALTER TABLE rate_limit_rules ADD COLUMN IF NOT EXISTS environment_id uuid REFERENCES environments(id) ON DELETE CASCADE`);
  await client.query(`ALTER TABLE rate_limit_rules ADD COLUMN IF NOT EXISTS strategy text NOT NULL DEFAULT 'sliding-window'`);
  await client.query(`ALTER TABLE rate_limit_rules ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100`);
  await client.query(`ALTER TABLE rate_limit_rules ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`ALTER TABLE workspace_invites ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
  await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rate_limit_rules_limit_positive'
      ) THEN
        ALTER TABLE rate_limit_rules
        ADD CONSTRAINT rate_limit_rules_limit_positive CHECK (limit_count > 0);
      END IF;
    END $$;
  `);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rate_limit_rules_window_positive'
      ) THEN
        ALTER TABLE rate_limit_rules
        ADD CONSTRAINT rate_limit_rules_window_positive CHECK (window_seconds > 0);
      END IF;
    END $$;
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_environments_user ON environments(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_environments_user_active ON environments(user_id, is_active)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_created ON api_keys(created_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_user ON rate_limit_rules(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_env ON rate_limit_rules(environment_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rate_limit_rules(user_id, enabled)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false`);
}

export async function down(client) {
  await client.query(`ALTER TABLE rate_limit_rules DROP CONSTRAINT IF EXISTS rate_limit_rules_limit_positive`);
  await client.query(`ALTER TABLE rate_limit_rules DROP CONSTRAINT IF EXISTS rate_limit_rules_window_positive`);
  await client.query(`ALTER TABLE notifications DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE teams DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE workspaces DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE workspace_invites DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE rate_limit_rules DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE rate_limit_rules DROP COLUMN IF EXISTS strategy`);
  await client.query(`ALTER TABLE rate_limit_rules DROP COLUMN IF EXISTS priority`);
  await client.query(`ALTER TABLE rate_limit_rules DROP COLUMN IF EXISTS environment_id`);
  await client.query(`ALTER TABLE api_keys DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE api_keys DROP COLUMN IF EXISTS last_used_at`);
  await client.query(`ALTER TABLE api_keys DROP COLUMN IF EXISTS key_prefix`);
  await client.query(`ALTER TABLE api_keys DROP COLUMN IF EXISTS environment`);
  await client.query(`ALTER TABLE environments DROP COLUMN IF EXISTS updated_at`);
  await client.query(`ALTER TABLE environments DROP COLUMN IF EXISTS base_url`);
}
