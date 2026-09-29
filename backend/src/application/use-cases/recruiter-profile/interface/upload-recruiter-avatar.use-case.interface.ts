export interface UploadRecruiterAvatarInput {
  userId: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadRecruiterAvatarResult {
  avatarUrl: string;
}

export interface IUploadRecruiterAvatarUseCase {
  execute(
    input: UploadRecruiterAvatarInput,
  ): Promise<UploadRecruiterAvatarResult>;
}

export const IUploadRecruiterAvatarUseCase = Symbol(
  'IUploadRecruiterAvatarUseCase',
);
