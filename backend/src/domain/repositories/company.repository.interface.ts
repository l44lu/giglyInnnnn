import { CompanyEntity } from '../entities/company.entity';
import { IBaseRepository } from './base.repository.interface';

export interface ICompanyRepository extends IBaseRepository<CompanyEntity> {
  findByName(name: string): Promise<CompanyEntity | null>;
}

export const ICompanyRepository = Symbol('ICompanyRepository');
