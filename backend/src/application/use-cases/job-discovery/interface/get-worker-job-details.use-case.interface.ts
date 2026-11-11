import { WorkerJobDetailsResponseDto } from '../../../dto/job-discovery/worker-job-details-response.dto';

export interface IGetWorkerJobDetailsUseCase {
  execute(jobId: string): Promise<WorkerJobDetailsResponseDto>;
}

export const IGetWorkerJobDetailsUseCase = Symbol(
  'IGetWorkerJobDetailsUseCase',
);
