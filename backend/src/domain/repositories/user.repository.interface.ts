import { UserEntities } from '../entities/user.entities';
import { IBaseRepository } from './base.repository.interface';

export interface IUserRepository extends IBaseRepository<UserEntities> {
  findByEmail(email: string): Promise<UserEntities | null>;
}

export const IUserRepository = Symbol('IUserRepository');
