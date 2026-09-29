export class WorkerSkillResponseDto {
  id!: string;
  skillId!: string;
  skillName!: string;

  constructor(partial: Partial<WorkerSkillResponseDto>) {
    Object.assign(this, partial);
  }
}
