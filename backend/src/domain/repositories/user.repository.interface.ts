import { UserEntities } from '../entities/user.entities';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntities | null>;
  findById(id: string): Promise<UserEntities | null>;
  create(data: Partial<UserEntities>): Promise<UserEntities>;
}

export const IUserRepository = Symbol('IUserRepository');
