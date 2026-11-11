import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { X, Paperclip, AlertCircle, Flag } from "lucide-react";
import {
  type JobDiscoveryItem,
  type WorkerJobDetails,
  type ReportJobResponse,
  WorkType,
  PaymentStructure,
} from "@/types/job";
import { reportJob, validateReportEvidenceFile } from "@/lib/worker-api";
import { formatRelativeTime } from "./JobCard";

export interface ReportJobModalProps {
  job: JobDiscoveryItem | WorkerJobDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (report: ReportJobResponse) => void;
  className?: string;
}

/**
 * Formats byte size into human readable string (KB / MB).
 */
// eslint-disable-next-line react-refresh/only-export-components
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Extracts a user-facing error message from an API failure.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const extractReportErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 409) {
      return "You already have a pending report for this job.";
    }
    if (status === 413) {
      return "Evidence file exceeds the 5MB upload limit.";
    }
    if (status === 400) {
      const data = error.response?.data as
        | { message?: string | string[] }
        | undefined;
      if (Array.isArray(data?.message)) {
        return data.message.join(", ");
      }
      if (typeof data?.message === "string" && data.message.trim().length > 0) {
        return data.message.trim();
      }
      return "Please check your report description and file format.";
    }
    const data = error.response?.data as { message?: string } | undefined;
    if (typeof data?.message === "string" && data.message.trim().length > 0) {
      return data.message.trim();
    }
  }
  return "Failed to submit report. Please check your connection and try again.";
};

export const ReportJobModal: React.FC<ReportJobModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
  className = "",
}) => {
  const [description, setDescription] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetFormState = useCallback(() => {
    setDescription("");
    setSelectedFile(null);
    setFileError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Reset internal state whenever modal closes or target job changes
  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        resetFormState();
      });
    }
  }, [isOpen, job?.id, resetFormState]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to dismiss (unless submitting)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        resetFormState();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose, resetFormState]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetFormState();
    onClose();
  }, [isSubmitting, onClose, resetFormState]);

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    if (val.length <= 500) {
      setDescription(val);
      setSubmitError(null);
    }
  };

  const handleTriggerUpload = () => {
    if (isSubmitting) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateReportEvidenceFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setSubmitError(null);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || isSubmitting) return;

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setSubmitError("Please provide a description of the issue.");
      return;
    }

    if (trimmedDescription.length > 500) {
      setSubmitError("Description cannot exceed 500 characters.");
      return;
    }

    if (fileError) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await reportJob(job.id, {
        description: trimmedDescription,
        evidence: selectedFile,
      });

      onSuccess?.(response);
      onClose();
    } catch (err: unknown) {
      setSubmitError(extractReportErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !job) {
    return null;
  }

  // Derive job summary metadata
  const companyName = job.company?.name?.trim() || "Independent Recruiter";
  const isLocal = job.workType === WorkType.LOCAL;
  const displayLocation =
    job.jobLocation?.trim() || (isLocal ? "Local on-site" : "Remote");
  const relativeTime = formatRelativeTime(job.createdAt);

  const formattedJobId = job.id.startsWith("JG-")
    ? job.id
    : `#JG-${job.id.slice(-5).toUpperCase()}`;

  const compensationLabel =
    job.paymentStructure === PaymentStructure.FIXED
      ? typeof job.budgetAmount === "number"
        ? `$${job.budgetAmount} per shift`
        : "—"
      : typeof job.hourlyRate === "number"
        ? `$${job.hourlyRate}/hr`
        : "—";

  const isSubmitDisabled =
    isSubmitting ||
    description.trim().length === 0 ||
    description.length > 500 ||
    Boolean(fileError);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      data-testid="report-job-modal-backdrop"
      onClick={handleClose}
      className={`fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${className}`}
    >
      <div
        data-testid="report-job-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative p-6 sm:p-7 transition-all my-auto"
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="report-modal-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900"
            >
              Report job
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Share the issue with this listing. Keep it short and clear so the
              admin team can review it quickly.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close report modal"
            data-testid="btn-close-report-modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inset Job Reference Card */}
        <div
          data-testid="report-job-summary"
          className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-semibold text-sm sm:text-base text-slate-900 leading-snug line-clamp-1">
              {job.title}
            </span>
            <span className="text-xs text-slate-400 font-medium shrink-0">
              {relativeTime}
            </span>
          </div>

          <p className="text-xs text-slate-400">Job ID {formattedJobId}</p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-slate-700 bg-white border border-slate-200/80 shadow-2xs">
              {companyName}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-slate-700 bg-white border border-slate-200/80 shadow-2xs">
              {displayLocation}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-slate-700 bg-white border border-slate-200/80 shadow-2xs">
              {compensationLabel}
            </span>
          </div>
        </div>

        {/* Report Form */}
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="mt-5 space-y-4"
        >
          {/* Description Field */}
          <div>
            <label
              htmlFor="report-description"
              className="block text-xs sm:text-sm font-semibold text-slate-800"
            >
              Describe the issue
            </label>
            <textarea
              id="report-description"
              data-testid="report-description-input"
              rows={4}
              value={description}
              maxLength={500}
              disabled={isSubmitting}
              onChange={handleDescriptionChange}
              placeholder="Example: The job says loading only, but the recruiter asked for extra unpaid work and changed the shift hours after I applied."
              className="mt-2 w-full rounded-xl border border-slate-200 p-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none transition-colors"
            />
            <div className="flex items-start justify-between gap-2 mt-1.5">
              <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                Include what happened, where it happened, and why the listing
                should be reviewed.
              </p>
              <span
                data-testid="report-character-counter"
                className={`text-[11px] sm:text-xs font-medium shrink-0 ${
                  description.length >= 500
                    ? "text-red-500 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Evidence Attachment Field */}
          <div>
            <span className="block text-xs sm:text-sm font-semibold text-slate-800">
              Add proof (optional)
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              data-testid="report-file-input"
            />

            {selectedFile ? (
              <div
                data-testid="report-file-preview"
                className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p
                      data-testid="report-file-name"
                      className="text-xs sm:text-sm font-medium text-slate-800 truncate"
                    >
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                  aria-label="Remove attached file"
                  data-testid="btn-remove-evidence"
                  className="w-7 h-7 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={handleTriggerUpload}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTriggerUpload();
                  }
                }}
                data-testid="report-file-dropzone"
                className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 flex items-center justify-between gap-3 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 truncate">
                      Attach screenshot or document
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Optional supporting file (JPEG, PNG, WebP, or PDF, max
                      5MB)
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs shrink-0">
                  Upload
                </span>
              </div>
            )}

            {fileError && (
              <p
                data-testid="report-file-error"
                className="text-xs text-red-600 mt-1.5 flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </p>
            )}
          </div>

          {/* Error Banner */}
          {submitError && (
            <div
              data-testid="report-error-banner"
              role="alert"
              className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs sm:text-sm text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{submitError}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="btn-cancel-report"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              data-testid="btn-submit-report"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Flag className="w-4 h-4 fill-white text-white shrink-0" />
              <span>{isSubmitting ? "Submitting..." : "Submit report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportJobModal;
