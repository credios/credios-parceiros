-- Contra-assinatura da Credios: novo estágio PARTNER_SIGNED + campos do
-- signatário admin. SIGNED passa a significar "assinado por ambas as partes".
ALTER TYPE "ContractStatus" ADD VALUE 'PARTNER_SIGNED';

ALTER TABLE "Contract"
  ADD COLUMN "adminSignedAt" TIMESTAMP(3),
  ADD COLUMN "adminSignerId" TEXT,
  ADD COLUMN "adminSignerName" TEXT;
