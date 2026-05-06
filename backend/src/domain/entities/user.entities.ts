export class UserEntities {
  id!: string;
  email!: string;
  passWordHash!: string;
  role!: 'ADMIN' | 'WORKER' | 'RECRUITER';
  firstName!: string;
  lastName!: string;
  createdAt!: Date;

  constructor(partail: Partial<UserEntities>) {
    Object.assign(this, partail);
  }
}
