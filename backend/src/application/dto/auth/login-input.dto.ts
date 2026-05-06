import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginInputDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
