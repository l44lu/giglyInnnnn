import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
  Save,
  Lock,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import { RecruiterSidebar } from "@/components/recruiter/RecruiterSidebar";
import {
  BasicInfoSection,
  JobDetailsSection,
  TimeLocationSection,
  BudgetPaymentSection,
} from "@/components/recruiter/job-posting";
import {
  getJobCategories,
  getRecruiterJobPostById,
  updateRecruiterJobPost,
} from "@/lib/job-api";
import { getSkillCatalog } from "@/lib/worker-api";
import {
  WorkType,
  PaymentStructure,
  JobStatus,
  type JobCategory,
  type JobPost,
  type UpdateJobPostPayload,
} from "@/types/job";
import type { Skill } from "@/types/worker-profile";

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
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
  return fallback;
};

const formatStartDateForInput = (
  dateString: string | null | undefined,
): string => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export const EditJob: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ----------------------------------------------------
  // Initial Fetched Job State
  // ----------------------------------------------------
  const [initialJob, setInitialJob] = useState<JobPost | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  // ----------------------------------------------------
  // Form State
  // ----------------------------------------------------
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [workType, setWorkType] = useState<WorkType>(WorkType.REMOTE);
  const [description, setDescription] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [workersNeeded, setWorkersNeeded] = useState<number | "">(1);
  const [startDate, setStartDate] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [shiftDuration, setShiftDuration] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [paymentStructure, setPaymentStructure] = useState<PaymentStructure>(
    PaymentStructure.FIXED,
  );
  const [budgetAmount, setBudgetAmount] = useState<number | "">("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");

  const handlePaymentStructureChange = (newStructure: PaymentStructure) => {
    setPaymentStructure(newStructure);
    if (newStructure === PaymentStructure.FIXED) {
      setHourlyRate("");
    } else {
      setBudgetAmount("");
    }
  };

  // ----------------------------------------------------
  // Submission & Remote Reference Catalogs State
  // ----------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [skillCatalog, setSkillCatalog] = useState<Skill[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  // ----------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const data = await getJobCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategoriesError("Unable to retrieve job categories.");
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    setIsLoadingSkills(true);
    setSkillsError(null);
    try {
      const data = await getSkillCatalog();
      setSkillCatalog(Array.isArray(data) ? data : []);
    } catch {
      setSkillsError("Unable to retrieve skills catalog.");
    } finally {
      setIsLoadingSkills(false);
    }
  }, []);

  const loadJobData = useCallback(async () => {
    if (!id) {
      setJobError("No job ID provided.");
      setIsLoadingJob(false);
      return;
    }

    setIsLoadingJob(true);
    setJobError(null);

    try {
      const job = await getRecruiterJobPostById(id);
      setInitialJob(job);

      // Populate Form Fields
      setTitle(job.title || "");
      setCategoryId(job.categoryId || "");
      setWorkType(job.workType || WorkType.REMOTE);
      setDescription(job.description || "");
      setSelectedSkillIds(
        job.skills && Array.isArray(job.skills)
          ? job.skills.map((s) => s.id)
          : [],
      );
      setWorkersNeeded(
        typeof job.workersNeeded === "number" ? job.workersNeeded : 1,
      );
      setStartDate(formatStartDateForInput(job.startDate));
      setEstimatedDuration(job.estimatedDuration ?? "");
      setShiftDuration(job.shiftDuration ?? "");
      setJobLocation(job.jobLocation ?? "");
      setPaymentStructure(job.paymentStructure || PaymentStructure.FIXED);

      if (job.paymentStructure === PaymentStructure.FIXED) {
        setBudgetAmount(
          typeof job.budgetAmount === "number" && !isNaN(job.budgetAmount)
            ? job.budgetAmount
            : "",
        );
        setHourlyRate("");
      } else {
        const rate =
          job.hourlyRate ?? job.hourlyRateMin ?? job.hourlyRateMax ?? "";
        setHourlyRate(typeof rate === "number" && !isNaN(rate) ? rate : "");
        setBudgetAmount("");
      }
    } catch (error: unknown) {
      const msg = extractErrorMessage(
        error,
        "Unable to retrieve job post details.",
      );
      setJobError(msg);
    } finally {
      setIsLoadingJob(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const initPage = async () => {
      try {
        await Promise.allSettled([
          loadJobData(),
          loadCategories(),
          loadSkills(),
        ]);
      } finally {
        if (isMounted) {
          // Handled within individual loaders
        }
      }
    };

    void initPage();

    return () => {
      isMounted = false;
    };
  }, [loadJobData, loadCategories, loadSkills]);

  // Status check: is job editable?
  const isEditableStatus = useMemo(() => {
    if (!initialJob) return true;
    return (
      initialJob.status === JobStatus.DRAFT ||
      initialJob.status === JobStatus.OPEN ||
      initialJob.status === JobStatus.PAUSED
    );
  }, [initialJob]);

  // ----------------------------------------------------
  // Payload Construction
  // ----------------------------------------------------
  const constructPayload = (): UpdateJobPostPayload => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = jobLocation.trim();
    const isLocal = workType === WorkType.LOCAL;

    const payload: UpdateJobPostPayload = {
      categoryId: categoryId.trim(),
      title: trimmedTitle,
      description: trimmedDescription,
      workType,
      paymentStructure,
      workersNeeded:
        typeof workersNeeded === "number" ? workersNeeded : undefined,
      skillIds: selectedSkillIds,
      startDate: startDate.trim() ? startDate.trim() : null,
      estimatedDuration: estimatedDuration.trim()
        ? estimatedDuration.trim()
        : null,
      shiftDuration: shiftDuration.trim() ? shiftDuration.trim() : null,
      jobLocation: isLocal && trimmedLocation ? trimmedLocation : null,
    };

    if (paymentStructure === PaymentStructure.FIXED) {
      payload.budgetAmount =
        typeof budgetAmount === "number" && !isNaN(budgetAmount)
          ? budgetAmount
          : null;
      payload.hourlyRate = null;
    } else {
      payload.budgetAmount = null;
      payload.hourlyRate =
        typeof hourlyRate === "number" && !isNaN(hourlyRate)
          ? hourlyRate
          : null;
    }

    return payload;
  };

  // ----------------------------------------------------
  // Client-Side Validation Rules
  // ----------------------------------------------------
  const validateForUpdate = (): { isValid: boolean; error?: string } => {
    if (!categoryId.trim()) {
      return { isValid: false, error: "Please select a job category." };
    }

    if (!title.trim()) {
      return { isValid: false, error: "Job title cannot be empty." };
    }

    if (!description.trim()) {
      return { isValid: false, error: "Job description cannot be empty." };
    }

    if (!workType || !Object.values(WorkType).includes(workType)) {
      return { isValid: false, error: "Please select a valid work type." };
    }

    if (
      !paymentStructure ||
      !Object.values(PaymentStructure).includes(paymentStructure)
    ) {
      return {
        isValid: false,
        error: "Please select a valid payment structure.",
      };
    }

    if (
      workersNeeded === "" ||
      typeof workersNeeded !== "number" ||
      isNaN(workersNeeded) ||
      !Number.isInteger(workersNeeded) ||
      workersNeeded <= 0
    ) {
      return {
        isValid: false,
        error: "Number of gigs needed must be a positive integer.",
      };
    }

    // Published (OPEN) and PAUSED gigs require non-empty location for local and positive budgets
    const isPublishedOrPaused =
      initialJob?.status === JobStatus.OPEN ||
      initialJob?.status === JobStatus.PAUSED;

    if (isPublishedOrPaused) {
      if (workType === WorkType.LOCAL && !jobLocation.trim()) {
        return {
          isValid: false,
          error: "Job location is required for on-site / local gigs.",
        };
      }

      if (paymentStructure === PaymentStructure.FIXED) {
        if (
          typeof budgetAmount !== "number" ||
          isNaN(budgetAmount) ||
          budgetAmount <= 0
        ) {
          return {
            isValid: false,
            error:
              "Budget amount must be a positive number for fixed price gigs.",
          };
        }
      } else if (paymentStructure === PaymentStructure.HOURLY) {
        if (
          typeof hourlyRate !== "number" ||
          isNaN(hourlyRate) ||
          hourlyRate <= 0
        ) {
          return {
            isValid: false,
            error:
              "Hourly rate must be a positive number for hourly rate gigs.",
          };
        }
      }
    } else {
      // DRAFT validation: if provided, must be positive
      if (paymentStructure === PaymentStructure.FIXED) {
        if (typeof budgetAmount === "number" && budgetAmount <= 0) {
          return {
            isValid: false,
            error: "Budget amount must be a positive number.",
          };
        }
      } else if (paymentStructure === PaymentStructure.HOURLY) {
        if (typeof hourlyRate === "number" && hourlyRate <= 0) {
          return {
            isValid: false,
            error: "Hourly rate must be a positive number.",
          };
        }
      }
    }

    return { isValid: true };
  };

  // ----------------------------------------------------
  // Workflow: Save Changes
  // ----------------------------------------------------
  const handleSaveChanges = async () => {
    if (isSubmitting || !id || !isEditableStatus) return;

    const validation = validateForUpdate();
    if (!validation.isValid) {
      await Swal.fire({
        title: "Validation Error",
        text: validation.error,
        icon: "warning",
        confirmButtonColor: "#1877f2",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = constructPayload();
      await updateRecruiterJobPost(id, payload);

      await Swal.fire({
        title: "Gig Updated Successfully!",
        text: "Your changes have been saved.",
        icon: "success",
        confirmButtonText: "Return to My Postings",
        confirmButtonColor: "#1877f2",
        allowOutsideClick: false,
      });

      void navigate("/recruiter/my-postings");
    } catch (error: unknown) {
      const message = extractErrorMessage(error, "Failed to update job post.");
      await Swal.fire({
        title: "Failed to Update Gig",
        text: message,
        icon: "error",
        confirmButtonColor: "#1877f2",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Dirty Check & Cancel Navigation
  // ----------------------------------------------------
  const isDirty = useMemo(() => {
    if (!initialJob) return false;

    const currentFormattedStart = startDate.trim();
    const initialFormattedStart = formatStartDateForInput(initialJob.startDate);

    const initialRate =
      initialJob.hourlyRate ??
      initialJob.hourlyRateMin ??
      initialJob.hourlyRateMax ??
      "";
    const initialBudget =
      typeof initialJob.budgetAmount === "number"
        ? initialJob.budgetAmount
        : "";

    const currentSkillsSorted = [...selectedSkillIds].sort();
    const initialSkillsSorted = (initialJob.skills || [])
      .map((s) => s.id)
      .sort();

    const skillsChanged =
      currentSkillsSorted.length !== initialSkillsSorted.length ||
      currentSkillsSorted.some((id, idx) => id !== initialSkillsSorted[idx]);

    return (
      title.trim() !== (initialJob.title || "").trim() ||
      categoryId !== initialJob.categoryId ||
      workType !== initialJob.workType ||
      description.trim() !== (initialJob.description || "").trim() ||
      workersNeeded !== initialJob.workersNeeded ||
      currentFormattedStart !== initialFormattedStart ||
      estimatedDuration.trim() !==
        (initialJob.estimatedDuration || "").trim() ||
      shiftDuration.trim() !== (initialJob.shiftDuration || "").trim() ||
      jobLocation.trim() !== (initialJob.jobLocation || "").trim() ||
      paymentStructure !== initialJob.paymentStructure ||
      budgetAmount !== initialBudget ||
      hourlyRate !== initialRate ||
      skillsChanged
    );
  }, [
    initialJob,
    title,
    categoryId,
    workType,
    description,
    workersNeeded,
    startDate,
    estimatedDuration,
    shiftDuration,
    jobLocation,
    paymentStructure,
    budgetAmount,
    hourlyRate,
    selectedSkillIds,
  ]);

  const handleCancel = async () => {
    if (!isDirty) {
      void navigate("/recruiter/my-postings");
      return;
    }

    const result = await Swal.fire({
      title: "Discard changes?",
      text: "You have unsaved edits that will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, discard",
      cancelButtonText: "Continue editing",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (result.isConfirmed) {
      void navigate("/recruiter/my-postings");
    }
  };

  const renderStatusPill = (status: JobStatus) => {
    switch (status) {
      case JobStatus.OPEN:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case JobStatus.DRAFT:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Draft
          </span>
        );
      case JobStatus.PAUSED:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* Left Navigation Sidebar */}
      <RecruiterSidebar activeTab="my-postings" />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-8 space-y-6">
          {/* Back Navigation Link */}
          <div className="flex items-center justify-between">
            <Link
              to="/recruiter/my-postings"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Postings</span>
            </Link>

            {initialJob && renderStatusPill(initialJob.status)}
          </div>

          {/* Page Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Edit Gig
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Update project details, requirements, and budget for this posting.
            </p>
          </div>

          {/* Initial Loading Skeleton */}
          {isLoadingJob && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 space-y-6 text-center">
              <Loader2 className="w-8 h-8 text-[#1877f2] animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Loading gig details...
                </p>
                <p className="text-xs text-slate-500">
                  Retrieving posting from the database.
                </p>
              </div>
            </div>
          )}

          {/* Initial Job Error State */}
          {!isLoadingJob && jobError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-900">
                  Unable to load gig
                </p>
                <p className="text-xs text-rose-700 max-w-md">{jobError}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    void loadJobData();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <Link
                  to="/recruiter/my-postings"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Return to My Postings
                </Link>
              </div>
            </div>
          )}

          {/* Non-Editable Status Warning */}
          {!isLoadingJob && !jobError && !isEditableStatus && initialJob && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <Lock className="w-8 h-8 text-amber-600" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900">
                  This gig is {initialJob.status} and cannot be edited
                </p>
                <p className="text-xs text-amber-700 max-w-md">
                  Job postings in filled, completed, or cancelled statuses are
                  locked to preserve historical contract records.
                </p>
              </div>
              <Link
                to="/recruiter/my-postings"
                className="mt-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shadow-2xs"
              >
                Return to My Postings
              </Link>
            </div>
          )}

          {/* Form Sections */}
          {!isLoadingJob && !jobError && isEditableStatus && (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* 1. Basic Information */}
              <BasicInfoSection
                title={title}
                onChangeTitle={setTitle}
                categoryId={categoryId}
                onChangeCategoryId={setCategoryId}
                workType={workType}
                onChangeWorkType={setWorkType}
                categories={categories}
                isLoadingCategories={isLoadingCategories}
                categoriesError={categoriesError}
                onRetryCategories={() => {
                  void loadCategories();
                }}
                disabled={isSubmitting}
              />

              {/* 2. Job Details */}
              <JobDetailsSection
                description={description}
                onChangeDescription={setDescription}
                selectedSkillIds={selectedSkillIds}
                onChangeSkillIds={setSelectedSkillIds}
                workersNeeded={workersNeeded}
                onChangeWorkersNeeded={setWorkersNeeded}
                skillCatalog={skillCatalog}
                isLoadingSkills={isLoadingSkills}
                skillsError={skillsError}
                onRetrySkills={() => {
                  void loadSkills();
                }}
                disabled={isSubmitting}
              />

              {/* 3. Time & Location */}
              <TimeLocationSection
                startDate={startDate}
                onChangeStartDate={setStartDate}
                estimatedDuration={estimatedDuration}
                onChangeEstimatedDuration={setEstimatedDuration}
                shiftDuration={shiftDuration}
                onChangeShiftDuration={setShiftDuration}
                jobLocation={jobLocation}
                onChangeJobLocation={setJobLocation}
                workType={workType}
                disabled={isSubmitting}
              />

              {/* 4. Budget & Payment */}
              <BudgetPaymentSection
                paymentStructure={paymentStructure}
                onChangePaymentStructure={handlePaymentStructureChange}
                budgetAmount={budgetAmount}
                onChangeBudgetAmount={setBudgetAmount}
                hourlyRate={hourlyRate}
                onChangeHourlyRate={setHourlyRate}
                disabled={isSubmitting}
              />

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-4 pb-12 border-t border-slate-200/80">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    void handleCancel();
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleSaveChanges();
                  }}
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors ${
                    isSubmitting
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default EditJob;
