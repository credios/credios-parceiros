-- Admins existentes viram ADMIN_MASTER (o programa nasce com o configurador).
UPDATE "User" SET "role" = 'ADMIN_MASTER' WHERE "role" = 'ADMIN';

-- Carteira: todo parceiro vinculado a um gerente (User ADMIN/ADMIN_MASTER).
ALTER TABLE "Partner" ADD COLUMN "managerId" TEXT;
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Partner_managerId_idx" ON "Partner"("managerId");

-- Backfill: parceiros existentes entram na carteira do primeiro master.
UPDATE "Partner" SET "managerId" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN_MASTER' ORDER BY "createdAt" ASC LIMIT 1
) WHERE "managerId" IS NULL;
