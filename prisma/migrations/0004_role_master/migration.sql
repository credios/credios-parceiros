-- Novo papel ADMIN_MASTER (configurador). Valor de enum precisa ser criado em
-- migração separada do uso (restrição do Postgres a novos valores na mesma tx).
ALTER TYPE "Role" ADD VALUE 'ADMIN_MASTER';
