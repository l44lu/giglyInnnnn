import { ReportJobResponseDto } from '../../../dto/job-discovery/report-job-response.dto';

export interface EvidenceFileInput {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

export interface ReportJobInput {
  reporterId: string;
  jobPostId: string;
  description: string;
  evidenceFile?: EvidenceFileInput;
}

export interface IReportJobUseCase {
  execute(input: ReportJobInput): Promise<ReportJobResponseDto>;
}

export const IReportJobUseCase = Symbol('IReportJobUseCase');
