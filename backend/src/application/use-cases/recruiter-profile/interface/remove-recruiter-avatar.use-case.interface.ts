export interface RemoveRecruiterAvatarResult {
  avatarUrl: null;
}

export interface IRemoveRecruiterAvatarUseCase {
  execute(userId: string): Promise<RemoveRecruiterAvatarResult>;
}

export const IRemoveRecruiterAvatarUseCase = Symbol(
  'IRemoveRecruiterAvatarUseCase',
);
