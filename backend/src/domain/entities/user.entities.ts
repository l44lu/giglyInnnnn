export class UserEntities {
  id!: string;
  email!: string;
  passWordHash!: string;
  role!: 'ADMIN' | 'WORKER' | 'RECRUITER';
  firstName!: string;
  lastName!: string;
  isActive: boolean = true;
  isBlocked: boolean = false;
  createdAt!: Date;

  constructor(partial?: Partial<UserEntities>) {
    Object.assign(this, partial);
    if (this.isActive === undefined) this.isActive = true;
    if (this.isBlocked === undefined) this.isBlocked = false;
  }

  canAuthenticate(): boolean {
    return this.isActive === true && this.isBlocked === false;
  }
  unAuthenticate(): boolean {
    return this.isActive === false && this.isBlocked === true;
  }
}
