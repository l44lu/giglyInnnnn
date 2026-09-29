export interface UploadRecruiterCompanyLogoInput {
  userId: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface UploadRecruiterCompanyLogoResult {
  logoUrl: string;
}

export interface IUploadRecruiterCompanyLogoUseCase {
  execute(
    input: UploadRecruiterCompanyLogoInput,
  ): Promise<UploadRecruiterCompanyLogoResult>;
}

export const IUploadRecruiterCompanyLogoUseCase = Symbol(
  'IUploadRecruiterCompanyLogoUseCase',
);
