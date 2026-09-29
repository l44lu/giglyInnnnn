import { IsBoolean, IsNotEmpty } from 'class-validator';

export class SetAdminUserBlockStatusInputDto {
  @IsNotEmpty({ message: 'isBlocked is required' })
  @IsBoolean({ message: 'isBlocked must be a boolean' })
  isBlocked!: boolean;

  constructor(partial?: Partial<SetAdminUserBlockStatusInputDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
