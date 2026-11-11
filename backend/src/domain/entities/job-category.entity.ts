export class JobCategoryEntity {
  id!: string;
  name!: string;
  description: string | null = null;
  createdAt!: Date;

  constructor(partial?: Partial<JobCategoryEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }
    if (this.description === undefined) {
      this.description = null;
    }
    this.validateInvariants();
  }

  private validateInvariants(): void {
    if (this.name !== undefined && this.name.trim() === '') {
      throw new Error('Category name cannot be empty');
    }
  }
}
