export class RefreshTokenEntity {
  id!: string;
  /**
   * Deterministic SHA-256 hash (64 hex characters) of the raw refresh JWT.
   * Raw refresh tokens are never persisted to the database.
   */
  token!: string;
  userId!: string;
  expiresAt!: Date;
  createdAt!: Date;
  familyId!: string;
  revokedAt: Date | null = null;

  constructor(partial: Partial<RefreshTokenEntity>) {
    Object.assign(this, partial);
    if (this.revokedAt === undefined) {
      this.revokedAt = null;
    }
  }
}
