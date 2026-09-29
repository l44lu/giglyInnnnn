export interface GetWorkerAvatarResult {
  buffer: Buffer;
  contentType: string;
}

export interface IGetWorkerAvatarUseCase {
  execute(userId: string): Promise<GetWorkerAvatarResult>;
}

export const IGetWorkerAvatarUseCase = Symbol('IGetWorkerAvatarUseCase');
