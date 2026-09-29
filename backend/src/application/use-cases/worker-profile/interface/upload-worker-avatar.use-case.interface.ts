export interface UploadWorkerAvatarInput {
  userId: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadWorkerAvatarResult {
  avatarUrl: string;
}

export interface IUploadWorkerAvatarUseCase {
  execute(input: UploadWorkerAvatarInput): Promise<UploadWorkerAvatarResult>;
}

export const IUploadWorkerAvatarUseCase = Symbol('IUploadWorkerAvatarUseCase');
