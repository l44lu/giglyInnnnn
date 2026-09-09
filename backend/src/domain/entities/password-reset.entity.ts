export class PasswordResetEntity {
  id!: string;
  userId!: string;
  otpHash!: string;
  tokenHash: string | null = null;
  attempts!: number;
  expiresAt!: Date;
  createdAt!: Date;

  constructor(partial: Partial<PasswordResetEntity>) {
    Object.assign(this, partial);
    if (this.tokenHash === undefined) {
      this.tokenHash = null;
    }
  }
}
