-- Phase 2: Better Auth admin plugin — role + ban columns.
-- - role: default flips from 'SERVANT' (Phase 1 default) to
--   'member' (admin plugin default for new sign-ups).
-- - banned / banReason / banExpires: lock state managed by
--   the admin plugin's banUser / unbanUser endpoints.
--   The global AuthGuard rejects every request when
--   banned = true.

ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'member';

ALTER TABLE "users"
  ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users"
  ADD COLUMN "banReason" TEXT;
ALTER TABLE "users"
  ADD COLUMN "banExpires" TIMESTAMP(3);

CREATE INDEX "users_banned_idx" ON "users"("banned");
