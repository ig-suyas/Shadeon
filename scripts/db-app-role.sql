-- Least-privilege database role for the running site.
--
-- The site only ever reads, inserts, updates and deletes rows in its tables.
-- It never needs to create, alter or drop anything, so it should not connect
-- as the database owner. Run this once as the owner (for example in the Neon
-- SQL editor) after `npm run db:migrate`, replacing the password with a long
-- random one. Then:
--   DATABASE_URL            -> connection string for shadeon_app (the site)
--   DATABASE_MIGRATION_URL  -> the owner's connection string (migrations only,
--                              never set on the deployed site)
--
-- No client ever talks to the database directly (there is no public data
-- API), and this role is the only one the site uses, so every row is reached
-- through the server code's own checks. The account tables additionally have
-- Row Level Security (below) in case another role is ever given access.

CREATE ROLE shadeon_app WITH LOGIN PASSWORD 'replace-with-a-long-random-password';

GRANT USAGE ON SCHEMA public TO shadeon_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE waitlist TO shadeon_app;
GRANT SELECT, INSERT, DELETE ON TABLE shader_requests TO shadeon_app;
GRANT SELECT, INSERT, DELETE ON TABLE messages TO shadeon_app;

-- Accounts (added with sign-in). Rows are never rewritten except the columns
-- the code changes (password, Google link); there is still no TRUNCATE or DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO shadeon_app;
GRANT SELECT, INSERT, DELETE ON TABLE sessions TO shadeon_app;
GRANT SELECT, INSERT, DELETE ON TABLE auth_tokens TO shadeon_app;

-- Defence in depth for the account tables: Row Level Security is on, and only
-- shadeon_app has a policy. If any other role is ever given access (for
-- example by turning on a hosted data API), it sees and changes nothing.
-- The owner bypasses RLS, so migrations are unaffected.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY shadeon_app_all ON users TO shadeon_app USING (true) WITH CHECK (true);
CREATE POLICY shadeon_app_all ON sessions TO shadeon_app USING (true) WITH CHECK (true);
CREATE POLICY shadeon_app_all ON auth_tokens TO shadeon_app USING (true) WITH CHECK (true);

-- No TRUNCATE, no DDL, no access to tables added later unless granted here.
-- After adding a table in a migration, add its grants to this file.
