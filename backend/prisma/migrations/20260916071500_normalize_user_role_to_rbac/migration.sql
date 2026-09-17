-- ==============================================================================
-- Migration: 20260916071500_normalize_user_role_to_rbac
-- Purpose: Clean introduction of single-role RBAC (User.roleId -> roles.id)
-- Strategy: Destructive development-data cleanup for disposable auth/user data
-- Preserved: "roles", "Permission", "RolePermission"
-- ==============================================================================

-- 1. Remove disposable development data referencing User in strict dependency order
DELETE FROM "RefreshToken";
DELETE FROM "PasswordReset";
DELETE FROM "RecruiterProfile";
DELETE FROM "WorkerProfile";
DELETE FROM "UserRole";
DELETE FROM "Otp";
DELETE FROM "User";

-- 2. Drop foreign keys on obsolete UserRole junction table
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_assignedBy_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_revokedBy_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- 3. Drop obsolete UserRole junction table
DROP TABLE "UserRole";

-- 4. Transform User table (replace legacy enum role with required roleId foreign key)
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" ADD COLUMN "roleId" TEXT NOT NULL;

CREATE INDEX "User_roleId_idx" ON "User"("roleId");
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Transform Otp staging table (replace legacy enum role with required roleId foreign key)
ALTER TABLE "Otp" DROP COLUMN "role";
ALTER TABLE "Otp" ADD COLUMN "roleId" TEXT NOT NULL;

CREATE INDEX "Otp_roleId_idx" ON "Otp"("roleId");
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Drop legacy PostgreSQL enum type now that no columns reference it
DROP TYPE "Role";
