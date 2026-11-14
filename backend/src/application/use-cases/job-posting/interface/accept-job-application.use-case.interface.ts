import {
  AcceptJobApplicationOutput,
  ManageJobApplicationCommand,
} from './job-application-hiring.types';

export interface IAcceptJobApplicationUseCase {
  execute(
    command: ManageJobApplicationCommand,
  ): Promise<AcceptJobApplicationOutput>;
}

export const IAcceptJobApplicationUseCase = Symbol(
  'IAcceptJobApplicationUseCase',
);
