-- Backfill existing users from User.role to UserRole
INSERT INTO "UserRole" ("id", "userId", "roleId", "assignedAt", "assignedBy", "revokedAt", "revokedBy")
SELECT
    gen_random_uuid()::text AS "id",
    u.id AS "userId",
    r.id AS "roleId",
    CURRENT_TIMESTAMP AS "assignedAt",
    NULL AS "assignedBy",
    NULL AS "revokedAt",
    NULL AS "revokedBy"
FROM "User" u
JOIN roles r ON r.code = u.role::text
WHERE NOT EXISTS (
    SELECT 1 FROM "UserRole" ur
    WHERE ur."userId" = u.id
      AND ur."roleId" = r.id
      AND ur."revokedAt" IS NULL
)
ON CONFLICT ("userId", "roleId") WHERE "revokedAt" IS NULL DO NOTHING;
