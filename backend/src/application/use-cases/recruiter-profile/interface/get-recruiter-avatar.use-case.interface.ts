export interface GetRecruiterAvatarResult {
  buffer: Buffer;
  contentType: string;
}

export interface IGetRecruiterAvatarUseCase {
  execute(userId: string): Promise<GetRecruiterAvatarResult>;
}

export const IGetRecruiterAvatarUseCase = Symbol('IGetRecruiterAvatarUseCase');
