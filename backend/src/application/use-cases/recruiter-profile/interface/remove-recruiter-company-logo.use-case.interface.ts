export interface RemoveRecruiterCompanyLogoResult {
  logoUrl: null;
}

export interface IRemoveRecruiterCompanyLogoUseCase {
  execute(userId: string): Promise<RemoveRecruiterCompanyLogoResult>;
}

export const IRemoveRecruiterCompanyLogoUseCase = Symbol(
  'IRemoveRecruiterCompanyLogoUseCase',
);
