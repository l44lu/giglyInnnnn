export class OtpEntity {
  id!: string;
  email!: string;
  otp!: string;
  firstName!: string;
  lastName!: string;
  passwordHash!: string;
  role!: 'ADMIN' | 'WORKER' | 'RECRUITER';
  attempts!: number;
  expiresAt!: Date;
  createdAt!: Date;

  constructor(partial: Partial<OtpEntity>) {
    Object.assign(this, partial);
  }
}
