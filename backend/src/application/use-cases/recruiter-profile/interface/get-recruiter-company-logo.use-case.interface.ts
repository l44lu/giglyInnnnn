export interface GetRecruiterCompanyLogoResult {
  buffer: Buffer;
  contentType: string;
}

export interface IGetRecruiterCompanyLogoUseCase {
  execute(userId: string): Promise<GetRecruiterCompanyLogoResult>;
}

export const IGetRecruiterCompanyLogoUseCase = Symbol(
  'IGetRecruiterCompanyLogoUseCase',
);
