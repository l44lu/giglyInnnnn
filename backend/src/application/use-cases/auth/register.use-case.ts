import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
//using "any" is not type safe so creating an interface to act along with it
export interface RegisterInput {
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

@Injectable()
export class RegisterUseCase {
  constructor(private prisma: PrismaService) {}

  async execute(data: RegisterInput) {
    //hash the password (security first!!!!!!!!!!!!!!!!!!!!!)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    //save to database using our Infrastructure tool
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });

    return user;
  }
}
