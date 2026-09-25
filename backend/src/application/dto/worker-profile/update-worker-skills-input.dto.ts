import { IsArray, IsUUID } from 'class-validator';

export class UpdateWorkerSkillsInputDto {
  @IsArray({ message: 'skillIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each skill ID must be a valid UUID' })
  skillIds!: string[];
}
