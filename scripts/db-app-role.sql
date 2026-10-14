-- Least-privilege database role for the running site.
--
-- The site only ever reads, inserts, updates and deletes rows in three tables.
-- It never needs to create, alter or drop anything, so it should not connect
-- as the database owner. Run this once as the owner (for example in the Neon
-- SQL editor) after `npm run db:migrate`, replacing the password with a long
-- random one. Then:
--   DATABASE_URL            -> connection string for shadeon_app (the site)
--   DATABASE_MIGRATION_URL  -> the owner's connection string (migrations only,
--                              never set on the deployed site)
--
-- Row Level Security is not used: no client ever talks to the database
-- directly (there is no public data API), and this role is the only one the
-- site uses, so every row is reached through the server code's own checks.

CREATE ROLE shadeon_app WITH LOGIN PASSWORD 'replace-with-a-long-random-password';

GRANT USAGE ON SCHEMA public TO shadeon_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE waitlist TO shadeon_app;
GRANT SELECT, INSERT, DELETE ON TABLE shader_requests TO shadeon_app;
GRANT SELECT, INSERT, DELETE ON TABLE messages TO shadeon_app;

-- No TRUNCATE, no DDL, no access to tables added later unless granted here.
-- After adding a table in a migration, add its grants to this file.
