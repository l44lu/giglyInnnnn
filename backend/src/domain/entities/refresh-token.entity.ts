export class RefreshTokenEntity {
  id!: string;
  /**
   * Deterministic SHA-256 hash (64 hex characters) of the raw refresh JWT.
   * Raw refresh tokens are never persisted to the database.
   */
  tokenHash!: string;
  userId!: string;
  expiresAt!: Date;
  createdAt!: Date;
  sessionId!: string;
  revokedAt: Date | null = null;
  revokedReason: string | null = null;

  constructor(partial: Partial<RefreshTokenEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }
    if (this.revokedAt === undefined) {
      this.revokedAt = null;
    }
    if (this.revokedReason === undefined) {
      this.revokedReason = null;
    }
  }
}
