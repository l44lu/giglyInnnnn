import {
  ManageJobApplicationCommand,
  ManageJobApplicationResult,
} from './job-application-hiring.types';

export interface IRejectJobApplicationUseCase {
  execute(
    command: ManageJobApplicationCommand,
  ): Promise<ManageJobApplicationResult>;
}

export const IRejectJobApplicationUseCase = Symbol(
  'IRejectJobApplicationUseCase',
);
