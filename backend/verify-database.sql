-- Database Verification Script for RateGuard Team & Workspace Management
-- Run this to verify your database is properly set up

-- 1. Check if required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('workspaces', 'workspace_members', 'workspace_invites', 'notifications') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('users', 'workspaces', 'workspace_members', 'workspace_invites', 'notifications')
ORDER BY table_name;

-- 2. Verify workspaces table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'workspaces'
ORDER BY ordinal_position;

-- 3. Verify workspace_members table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'workspace_members'
ORDER BY ordinal_position;

-- 4. Verify workspace_invites table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'workspace_invites'
ORDER BY ordinal_position;

-- 5. Verify notifications table structure (create if missing)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 6. Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('workspaces', 'workspace_members', 'workspace_invites', 'notifications')
ORDER BY tc.table_name, tc.constraint_name;

-- 7. Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('workspaces', 'workspace_members', 'workspace_invites', 'notifications')
ORDER BY tablename, indexname;

-- 8. Sample data counts (after running the app)
SELECT 'workspaces' as table_name, COUNT(*) as row_count FROM workspaces
UNION ALL
SELECT 'workspace_members', COUNT(*) FROM workspace_members
UNION ALL
SELECT 'workspace_invites', COUNT(*) FROM workspace_invites
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- 9. Check role constraints
SELECT
  table_name,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%role%'
  OR constraint_name LIKE '%status%';

-- 10. Test query: Get all workspaces with their members
SELECT
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  u_owner.email as owner_email,
  COUNT(wm.id) as member_count
FROM workspaces w
JOIN users u_owner ON u_owner.id = w.owner_id
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
GROUP BY w.id, w.name, w.owner_id, u_owner.email
ORDER BY w.created_at DESC;

-- 11. Test query: Get pending invites
SELECT
  wi.id as invite_id,
  wi.email as invited_email,
  wi.role,
  wi.status,
  wi.created_at,
  w.name as workspace_name,
  u.email as invited_by_email
FROM workspace_invites wi
JOIN workspaces w ON w.id = wi.workspace_id
JOIN users u ON u.id = wi.invited_by
WHERE wi.status = 'pending'
ORDER BY wi.created_at DESC;

-- 12. Test query: Get notifications with user info
SELECT
  n.id as notification_id,
  n.type,
  n.payload,
  n.is_read,
  n.created_at,
  u.email as user_email
FROM notifications n
JOIN users u ON u.id = n.user_id
ORDER BY n.created_at DESC
LIMIT 10;
