export class SkillResponseDto {
  id!: string;
  name!: string;

  constructor(partial: Partial<SkillResponseDto>) {
    Object.assign(this, partial);
  }
}
