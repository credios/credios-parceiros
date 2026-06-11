-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PARTNER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('INVITED', 'PENDING_CONTRACT', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('RECEBIDO', 'EM_ANALISE', 'DOCUMENTACAO', 'AVALIACAO_IMOVEL', 'EM_BANCO', 'APROVADO', 'CONTRATACAO', 'LIBERADO', 'RECUSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PREVISTA', 'A_RECEBER', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "partnerId" TEXT,
    "inviteToken" TEXT,
    "inviteExpiry" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'INVITED',
    "personType" "PersonType" NOT NULL,
    "legalName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "repName" TEXT,
    "repDocument" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "pixKey" TEXT,
    "bankInfo" JSONB,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 1.50,
    "crmPartnerRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "product" TEXT NOT NULL DEFAULT 'CGI',
    "requestedAmount" DECIMAL(14,2),
    "propertyValue" DECIMAL(14,2),
    "propertyCity" TEXT,
    "notes" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'RECEBIDO',
    "crmLeadId" TEXT,
    "crmSyncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAmount" DECIMAL(14,2),
    "disbursedAmount" DECIMAL(14,2),
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "from" "LeadStatus",
    "to" "LeadStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'A_RECEBER',
    "paidAt" TIMESTAMP(3),
    "paymentProof" BYTEA,
    "paymentProofMime" TEXT,
    "invoice" BYTEA,
    "invoiceMime" TEXT,
    "invoiceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signToken" TEXT NOT NULL,
    "signTokenExp" TIMESTAMP(3) NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "otpHash" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "pdfUnsigned" BYTEA,
    "pdfSigned" BYTEA,
    "documentHash" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAuditEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "geo" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_partnerId_key" ON "User"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_document_key" ON "Partner"("document");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_crmLeadId_key" ON "Lead"("crmLeadId");

-- CreateIndex
CREATE INDEX "Lead_partnerId_status_idx" ON "Lead"("partnerId", "status");

-- CreateIndex
CREATE INDEX "Lead_document_idx" ON "Lead"("document");

-- CreateIndex
CREATE INDEX "Lead_crmSyncStatus_idx" ON "Lead"("crmSyncStatus");

-- CreateIndex
CREATE INDEX "LeadStatusEvent_leadId_createdAt_idx" ON "LeadStatusEvent"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_leadId_key" ON "Commission"("leadId");

-- CreateIndex
CREATE INDEX "Commission_partnerId_status_idx" ON "Commission"("partnerId", "status");

-- CreateIndex
CREATE INDEX "Commission_status_createdAt_idx" ON "Commission"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplate_version_key" ON "ContractTemplate"("version");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_signToken_key" ON "Contract"("signToken");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_verifyCode_key" ON "Contract"("verifyCode");

-- CreateIndex
CREATE INDEX "Contract_partnerId_idx" ON "Contract"("partnerId");

-- CreateIndex
CREATE INDEX "ContractAuditEvent_contractId_createdAt_idx" ON "ContractAuditEvent"("contractId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationLog_success_createdAt_idx" ON "IntegrationLog"("success", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusEvent" ADD CONSTRAINT "LeadStatusEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAuditEvent" ADD CONSTRAINT "ContractAuditEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

