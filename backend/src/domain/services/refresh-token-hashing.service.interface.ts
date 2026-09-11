export interface IRefreshTokenHashingService {
  hash(token: string): string;
}

export const IRefreshTokenHashingService = Symbol(
  'IRefreshTokenHashingService',
);
