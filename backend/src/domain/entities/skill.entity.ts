export class SkillEntity {
  id!: string;
  name!: string;
  createdAt!: Date;

  constructor(partial?: Partial<SkillEntity>) {
    Object.assign(this, partial);
  }
}
