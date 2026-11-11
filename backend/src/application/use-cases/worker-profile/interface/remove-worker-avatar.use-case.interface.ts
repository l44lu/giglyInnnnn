export interface RemoveWorkerAvatarResult {
  avatarUrl: null;
}

export interface IRemoveWorkerAvatarUseCase {
  execute(userId: string): Promise<RemoveWorkerAvatarResult>;
}

export const IRemoveWorkerAvatarUseCase = Symbol('IRemoveWorkerAvatarUseCase');
