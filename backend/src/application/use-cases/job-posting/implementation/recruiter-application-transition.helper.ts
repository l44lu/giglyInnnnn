import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { TransitionJobApplicationParams } from '../../../../domain/repositories/job-application.repository.interface';
import { InvalidJobApplicationTransitionError } from '../../../../domain/entities/job-application.entity';
import {
  ApplicationAuthorizationError,
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';
import { ManageJobApplicationCommand } from '../interface/job-application-hiring.types';

function normalizeRequiredId(value: string, label: string): string {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new ApplicationValidationError(`${label} is required`);
  }
  return value.trim();
}

function normalizeReasonNote(
  reasonNote: string | null | undefined,
): string | null {
  if (reasonNote === undefined || reasonNote === null) {
    return null;
  }
  if (typeof reasonNote !== 'string') {
    throw new ApplicationValidationError('reasonNote must be a string');
  }
  const trimmed = reasonNote.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapHiringTransitionError(error: unknown): Error {
  if (
    error instanceof ApplicationValidationError ||
    error instanceof ApplicationNotFoundError ||
    error instanceof ApplicationAuthorizationError ||
    error instanceof ApplicationConflictError
  ) {
    return error;
  }

  if (error instanceof InvalidJobApplicationTransitionError) {
    return new ApplicationConflictError(error.message);
  }

  if (error instanceof Error && error.name.startsWith('PrismaClient')) {
    const code = (error as { code?: unknown }).code;
    if (code === 'P2025') {
      return new ApplicationNotFoundError('Job post or application not found');
    }
    return new ApplicationConflictError(
      'Unable to update application status due to a persistence conflict',
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Failed to process application status transition');
}

/**
 * Shared execution wrapper for recruiter application transitions.
 * Validates command fields, resolves recruiter ownership strictly from
 * the authenticated userId, and maps domain/persistence errors consistently.
 */
export async function executeRecruiterApplicationTransition<TResult>(
  recruiterProfileRepository: IRecruiterProfileRepository,
  command: ManageJobApplicationCommand,
  runTransition: (params: TransitionJobApplicationParams) => Promise<TResult>,
): Promise<TResult> {
  if (!command) {
    throw new ApplicationValidationError(
      'Application transition details are required',
    );
  }

  const userId = normalizeRequiredId(command.userId, 'User ID');
  const jobPostId = normalizeRequiredId(command.jobPostId, 'Job post ID');
  const applicationId = normalizeRequiredId(
    command.applicationId,
    'Application ID',
  );
  const reasonNote = normalizeReasonNote(command.reasonNote);

  const recruiterProfile =
    await recruiterProfileRepository.findByUserId(userId);
  if (!recruiterProfile) {
    throw new ApplicationNotFoundError('Recruiter profile not found');
  }

  try {
    return await runTransition({
      jobPostId,
      applicationId,
      recruiterId: recruiterProfile.id,
      changedByUserId: userId,
      reasonNote,
    });
  } catch (error) {
    throw mapHiringTransitionError(error);
  }
}
