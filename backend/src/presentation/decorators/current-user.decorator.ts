import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  role: 'ADMIN' | 'WORKER' | 'RECRUITER';
  sub?: string;
}

export const currentUserFactory = (
  data: keyof CurrentUserData | 'sub' | undefined,
  ctx: ExecutionContext,
) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request?.user as
    | (CurrentUserData & { sub?: string })
    | undefined;
  if (!user) return undefined;
  if (!data) return user;
  if (data === 'id') return user.id ?? user.sub;
  if (data === 'sub') return user.sub ?? user.id;
  return user[data as keyof CurrentUserData];
};

export const CurrentUser = createParamDecorator(currentUserFactory);
