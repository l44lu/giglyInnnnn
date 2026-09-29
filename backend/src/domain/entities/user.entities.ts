import { Role } from '../enums/role.enum';

export { Role };

export class UserEntities {
  id!: string;
  email!: string;
  passWordHash!: string;
  role!: Role;
  firstName!: string;
  lastName!: string;
  phone: string | null = null;
  location: string | null = null;
  bio: string | null = null;
  avatarUrl: string | null = null;
  isActive: boolean = true;
  isBlocked: boolean = false;
  createdAt!: Date;

  constructor(partial?: Partial<UserEntities>) {
    Object.assign(this, partial);
    if (this.isActive === undefined) this.isActive = true;
    if (this.isBlocked === undefined) this.isBlocked = false;
    if (this.phone === undefined) this.phone = null;
    if (this.location === undefined) this.location = null;
    if (this.bio === undefined) this.bio = null;
    if (this.avatarUrl === undefined) this.avatarUrl = null;
  }

  canAuthenticate(): boolean {
    return this.isActive === true && this.isBlocked === false;
  }
}
