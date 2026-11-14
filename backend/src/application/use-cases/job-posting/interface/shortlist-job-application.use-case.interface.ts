import {
  ManageJobApplicationCommand,
  ManageJobApplicationResult,
} from './job-application-hiring.types';

export interface IShortlistJobApplicationUseCase {
  execute(
    command: ManageJobApplicationCommand,
  ): Promise<ManageJobApplicationResult>;
}

export const IShortlistJobApplicationUseCase = Symbol(
  'IShortlistJobApplicationUseCase',
);
