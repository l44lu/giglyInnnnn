import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  X,
  MapPin,
  AlertCircle,
  Flag,
  Building2,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { type WorkerJobDetails, WorkType, PaymentStructure } from "@/types/job";
import { getWorkerJobDetails } from "@/lib/worker-api";
import { formatStartDate } from "./JobCard";

export interface JobDetailsModalProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (job: WorkerJobDetails) => void;
  onReport?: (job: WorkerJobDetails) => void;
  className?: string;
}

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return "NOT_FOUND";
    }
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(", ");
      }
      return data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to load job details. Please try again.";
};

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  jobId,
  isOpen,
  onClose,
  onApply,
  onReport,
  className = "",
}) => {
  const [job, setJob] = useState<WorkerJobDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  // Request tracker to prevent race conditions from rapid modal opening/closing/switching
  const activeRequestIdRef = useRef<number>(0);

  // Fetch job details whenever isOpen, jobId, or retryTrigger changes
  useEffect(() => {
    if (!isOpen || !jobId) {
      queueMicrotask(() => {
        setJob(null);
        setIsLoading(false);
        setErrorMessage(null);
      });
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    let isCancelled = false;

    const fetchDetails = async () => {
      try {
        const data = await getWorkerJobDetails(jobId);
        if (!isCancelled && currentRequestId === activeRequestIdRef.current) {
          setJob(data);
          setErrorMessage(null);
        }
      } catch (err: unknown) {
        if (!isCancelled && currentRequestId === activeRequestIdRef.current) {
          setErrorMessage(extractErrorMessage(err));
        }
      } finally {
        if (!isCancelled && currentRequestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      if (!isCancelled && currentRequestId === activeRequestIdRef.current) {
        setIsLoading(true);
        setErrorMessage(null);
      }
    });

    void fetchDetails();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, jobId, retryTrigger]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleRetry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  if (!isOpen) {
    return null;
  }

  // Rate and label formatting
  const rateDisplay = job
    ? job.paymentStructure === PaymentStructure.FIXED
      ? typeof job.budgetAmount === "number"
        ? `$${job.budgetAmount}`
        : "—"
      : typeof job.hourlyRate === "number"
        ? `$${job.hourlyRate}`
        : "—"
    : "—";

  const rateSubtext = job
    ? job.paymentStructure === PaymentStructure.FIXED
      ? "Per shift"
      : typeof job.hourlyRate === "number"
        ? "/hr"
        : "Hourly"
    : "";

  const companyName = job?.company?.name || "Independent Recruiter";
  const displayLocation =
    job?.jobLocation ||
    (job?.workType === WorkType.REMOTE
      ? "Remote"
      : "Location provided upon hire");

  const formattedStart = formatStartDate(job?.startDate);
  const shiftLengthDisplay =
    job?.shiftDuration || job?.estimatedDuration || "—";
  const workModeDisplay =
    job?.workType === WorkType.LOCAL ? "On-site / local" : "Remote";

  const workersNeededDisplay = job
    ? `${job.workersNeeded} helper${job.workersNeeded > 1 ? "s" : ""}`
    : "—";

  const recruiterInitials =
    job?.recruiter?.name
      ?.split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "R";

  return (
    <div
      data-testid="job-details-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        data-testid="job-details-modal-backdrop"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-details-title"
        data-testid="job-details-modal-card"
        className={`relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-left ${className}`}
      >
        {/* Loading State */}
        {isLoading && (
          <div
            data-testid="job-details-loading"
            className="p-12 text-center flex flex-col items-center justify-center min-h-[360px] space-y-4"
          >
            <div className="inline-block h-9 w-9 animate-spin rounded-full border-3 border-[#1877f2] border-t-transparent" />
            <p className="text-sm font-semibold text-slate-600">
              Loading job details...
            </p>
          </div>
        )}

        {/* 404 / Closed Job State */}
        {!isLoading && errorMessage === "NOT_FOUND" && (
          <div
            data-testid="job-details-not-found"
            className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[360px] space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center">
              <SearchX className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Job Not Available
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                This job posting is no longer active, has already been filled,
                or is no longer accepting worker applications.
              </p>
            </div>
            <button
              type="button"
              data-testid="btn-close-not-found"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* General Error State */}
        {!isLoading && errorMessage && errorMessage !== "NOT_FOUND" && (
          <div
            data-testid="job-details-error"
            className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[360px] space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Failed to Load Job Details
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {errorMessage}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="btn-retry-details"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                data-testid="btn-close-error"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Success / Populated State */}
        {!isLoading && !errorMessage && job && (
          <>
            {/* Header: Title, Company, Rate & Close */}
            <div className="px-6 pt-6 pb-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2
                  id="job-details-title"
                  data-testid="job-details-title"
                  className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug"
                >
                  {job.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#1877f2] font-semibold mt-1">
                  {job.company?.logoUrl ? (
                    <img
                      src={job.company.logoUrl}
                      alt={companyName}
                      className="w-4 h-4 rounded-sm object-cover"
                    />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-[#1877f2] shrink-0" />
                  )}
                  <span data-testid="job-details-company">{companyName}</span>
                </div>
              </div>

              <div className="flex items-start gap-4 shrink-0">
                <div className="text-right">
                  <div
                    data-testid="job-details-rate"
                    className="text-xl sm:text-2xl font-extrabold text-slate-900"
                  >
                    {rateDisplay}
                  </div>
                  {rateSubtext && (
                    <div
                      data-testid="job-details-rate-label"
                      className="text-[11px] font-semibold text-slate-400 -mt-0.5"
                    >
                      {rateSubtext}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="btn-close-details-x"
                  onClick={onClose}
                  aria-label="Close details dialog"
                  className="p-1.5 -mr-1.5 -mt-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div
              data-testid="job-details-body"
              className="px-6 py-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs sm:text-sm"
            >
              {/* Section 1: About the Recruiter */}
              <section
                data-testid="section-recruiter"
                aria-labelledby="recruiter-heading"
                className="space-y-3"
              >
                <h3
                  id="recruiter-heading"
                  className="text-xs sm:text-sm font-bold text-slate-900"
                >
                  About the Recruiter
                </h3>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-center gap-3.5">
                    {job.recruiter?.avatarUrl ? (
                      <img
                        src={job.recruiter.avatarUrl}
                        alt={job.recruiter.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0 shadow-2xs">
                        {recruiterInitials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4
                        data-testid="recruiter-name"
                        className="text-sm sm:text-base font-bold text-slate-900 truncate"
                      >
                        {job.recruiter?.name || "Recruiter"}
                      </h4>

                      {job.recruiter?.roleTitle && (
                        <p
                          data-testid="recruiter-role"
                          className="text-xs text-slate-500 truncate mt-0.5"
                        >
                          {job.recruiter.roleTitle}
                        </p>
                      )}

                      {job.recruiter?.location && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span data-testid="recruiter-location">
                            {job.recruiter.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {job.recruiter?.bio ? (
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs text-slate-600 leading-relaxed shadow-2xs">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        ABOUT
                      </span>
                      <p
                        data-testid="recruiter-bio"
                        className="whitespace-pre-line"
                      >
                        {job.recruiter.bio}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Section 2: Basic Information */}
              <section
                data-testid="section-basic-info"
                aria-labelledby="basic-info-heading"
                className="space-y-3"
              >
                <h3
                  id="basic-info-heading"
                  className="text-xs sm:text-sm font-bold text-slate-900"
                >
                  Basic Information
                </h3>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 grid grid-cols-2 gap-y-4 gap-x-6 shadow-2xs">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      JOB TYPE
                    </span>
                    <span
                      data-testid="basic-job-type"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {job.category?.name || "General Shift"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      WORK MODE
                    </span>
                    <span
                      data-testid="basic-work-mode"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {workModeDisplay}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      NUMBER OF WORKERS NEEDED
                    </span>
                    <span
                      data-testid="basic-workers-needed"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {workersNeededDisplay}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      SHIFT LENGTH
                    </span>
                    <span
                      data-testid="basic-shift-length"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {shiftLengthDisplay}
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 3: Job Details */}
              <section
                data-testid="section-job-details"
                aria-labelledby="job-details-heading"
                className="space-y-3"
              >
                <h3
                  id="job-details-heading"
                  className="text-xs sm:text-sm font-bold text-slate-900"
                >
                  Job Details
                </h3>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      JOB DESCRIPTION
                    </span>
                    <p
                      data-testid="job-description"
                      className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line"
                    >
                      {job.description}
                    </p>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        REQUIRED SKILLS & REQUIREMENTS
                      </span>
                      <div
                        data-testid="job-skills-chips"
                        className="flex flex-wrap gap-1.5"
                      >
                        {job.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200/90 text-slate-600 bg-slate-50/60"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 4: Time & Location */}
              <section
                data-testid="section-time-location"
                aria-labelledby="time-location-heading"
                className="space-y-3"
              >
                <h3
                  id="time-location-heading"
                  className="text-xs sm:text-sm font-bold text-slate-900"
                >
                  Time & Location
                </h3>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        START DATE & TIME
                      </span>
                      <span
                        data-testid="time-start"
                        className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                      >
                        {formattedStart}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        ESTIMATED DURATION
                      </span>
                      <span
                        data-testid="time-duration"
                        className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                      >
                        {job.estimatedDuration || "—"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      JOB LOCATION
                    </span>
                    <span
                      data-testid="location-text"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {displayLocation}
                    </span>
                  </div>

                  {/* Stylized Map View Preview (matching Figma visual) */}
                  <div
                    data-testid="map-preview"
                    className="relative h-28 sm:h-32 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center"
                  >
                    {/* SVG abstract map roads pattern */}
                    <svg
                      className="absolute inset-0 w-full h-full text-slate-200"
                      xmlns="http://www.w3.org/2000/svg"
                      preserveAspectRatio="none"
                      viewBox="0 0 400 120"
                    >
                      <path
                        d="M-20,30 Q100,50 200,20 T420,40"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                      />
                      <path
                        d="M-20,90 Q150,60 250,95 T420,80"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                      />
                      <path
                        d="M80,-10 L120,130"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                      />
                      <path
                        d="M260,-10 L300,130"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                      />
                    </svg>

                    {/* Blue Pin Marker */}
                    <div className="relative z-10 w-9 h-9 rounded-full bg-[#1877f2] border-2 border-white shadow-md flex items-center justify-center text-white animate-bounce-subtle">
                      <MapPin className="w-5 h-5 fill-white text-[#1877f2]" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Payment Summary */}
              <section
                data-testid="section-payment-summary"
                aria-labelledby="payment-heading"
                className="space-y-3"
              >
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      PAYMENT STRUCTURE
                    </span>
                    <span
                      data-testid="payment-structure-val"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {job.paymentStructure === PaymentStructure.FIXED
                        ? "Fixed price"
                        : "Hourly rate"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {job.paymentStructure === PaymentStructure.FIXED
                        ? "BUDGET AMOUNT"
                        : "HOURLY RATE"}
                    </span>
                    <span
                      data-testid="payment-amount-val"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      {job.paymentStructure === PaymentStructure.FIXED
                        ? typeof job.budgetAmount === "number"
                          ? `$${job.budgetAmount} total`
                          : "—"
                        : typeof job.hourlyRate === "number"
                          ? `$${job.hourlyRate}/hr`
                          : "—"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      PAYMENT METHOD
                    </span>
                    <span
                      data-testid="payment-method-val"
                      className="block text-xs sm:text-sm font-semibold text-slate-900 mt-1"
                    >
                      Paid through platform after shift completion
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <p className="text-[11px] sm:text-xs text-slate-400">
                Review the full job information before applying.
              </p>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {/* Report Button */}
                <button
                  type="button"
                  data-testid="btn-report-job"
                  onClick={() => onReport?.(job)}
                  title="Report this listing"
                  aria-label="Report this listing"
                  className="p-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <Flag className="w-4 h-4 text-white fill-white" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  data-testid="btn-close-details"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>

                {/* Apply Button */}
                <button
                  type="button"
                  data-testid="btn-apply-job"
                  onClick={() => onApply?.(job)}
                  className="px-5 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Apply for this Job
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JobDetailsModal;
