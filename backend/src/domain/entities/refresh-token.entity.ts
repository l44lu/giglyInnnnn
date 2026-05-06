export class RefreshTokenEntity {
  id!: string;
  token!: string;
  userId!: string;
  expiresAt!: Date;
  createdAt!: Date;

  constructor(partial: Partial<RefreshTokenEntity>) {
    Object.assign(this, partial);
  }
}
