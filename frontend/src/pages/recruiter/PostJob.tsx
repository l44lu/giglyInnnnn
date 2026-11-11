import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Lock,
  Loader2,
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
  createDraftJobPost,
  publishJobPost,
} from "@/lib/job-api";
import { getSkillCatalog } from "@/lib/worker-api";
import {
  WorkType,
  PaymentStructure,
  type JobCategory,
  type CreateDraftJobPostPayload,
} from "@/types/job";
import type { Skill } from "@/types/worker-profile";

type SubmissionState =
  | "idle"
  | "creating_draft"
  | "publishing"
  | "draft_saved"
  | "publish_failed"
  | "published";

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

export const PostJob: React.FC = () => {
  const navigate = useNavigate();

  // ----------------------------------------------------
  // Form State (Mapped to CreateDraftJobPostPayload)
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
  // Submission & Workflow State
  // ----------------------------------------------------
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----------------------------------------------------
  // Remote Data State (Categories & Skill Catalog)
  // ----------------------------------------------------
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

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        const [catsResult, skillsResult] = await Promise.allSettled([
          getJobCategories(),
          getSkillCatalog(),
        ]);

        if (!isMounted) return;

        if (catsResult.status === "fulfilled") {
          setCategories(
            Array.isArray(catsResult.value) ? catsResult.value : [],
          );
        } else {
          setCategoriesError("Unable to retrieve job categories.");
        }

        if (skillsResult.status === "fulfilled") {
          setSkillCatalog(
            Array.isArray(skillsResult.value) ? skillsResult.value : [],
          );
        } else {
          setSkillsError("Unable to retrieve skills catalog.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
          setIsLoadingSkills(false);
        }
      }
    };

    void initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // Payload Construction
  // ----------------------------------------------------
  const constructPayload = (): CreateDraftJobPostPayload => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = jobLocation.trim();
    const isLocal = workType === WorkType.LOCAL;

    const payload: CreateDraftJobPostPayload = {
      categoryId: categoryId.trim(),
      title: trimmedTitle,
      description: trimmedDescription,
      workType,
      paymentStructure,
      workersNeeded:
        typeof workersNeeded === "number" ? workersNeeded : undefined,
      skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
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
  const validateForDraft = (): { isValid: boolean; error?: string } => {
    if (categories.length === 0 && !isLoadingCategories) {
      return {
        isValid: false,
        error:
          "Job categories are not currently available. Please wait until categories are seeded to create a job draft.",
      };
    }

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

    return { isValid: true };
  };

  const validateForPublish = (): { isValid: boolean; error?: string } => {
    const draftValidation = validateForDraft();
    if (!draftValidation.isValid) {
      return draftValidation;
    }

    if (workType === WorkType.LOCAL && !jobLocation.trim()) {
      return {
        isValid: false,
        error: "Job location is required for on-site / local jobs.",
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
            "Budget amount must be a positive number for fixed price jobs.",
        };
      }
    }

    if (paymentStructure === PaymentStructure.HOURLY) {
      if (
        typeof hourlyRate !== "number" ||
        isNaN(hourlyRate) ||
        hourlyRate <= 0
      ) {
        return {
          isValid: false,
          error: "Hourly rate must be a positive number for hourly jobs.",
        };
      }
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

    return { isValid: true };
  };

  // ----------------------------------------------------
  // Workflow: Save Draft
  // ----------------------------------------------------
  const handleSaveDraft = async () => {
    if (isSubmitting) return;

    // Prevent duplicate draft creation if draft is already saved
    if (savedDraftId) {
      await Swal.fire({
        title: "Draft Already Saved",
        text: "This job has already been saved as a draft. You can publish it using the Post Job Now button.",
        icon: "info",
        confirmButtonText: "Got it",
        confirmButtonColor: "#1877f2",
      });
      return;
    }

    const validation = validateForDraft();
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
    setSubmissionState("creating_draft");

    try {
      const payload = constructPayload();
      const createdDraft = await createDraftJobPost(payload);
      setSavedDraftId(createdDraft.id);
      setSubmissionState("draft_saved");

      await Swal.fire({
        title: "Draft saved successfully!",
        text: "Your job has been saved as a draft. You can publish it using the Post Job Now button.",
        icon: "success",
        confirmButtonText: "Got it",
        confirmButtonColor: "#1877f2",
      });
    } catch (error: unknown) {
      const message = extractErrorMessage(
        error,
        "Failed to save job post draft.",
      );
      setSubmissionState("idle");
      await Swal.fire({
        title: "Failed to Save Draft",
        text: message,
        icon: "error",
        confirmButtonColor: "#1877f2",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Workflow: Post Job Now (Two-Request or Publish-Only)
  // ----------------------------------------------------
  const handlePostJobNow = async () => {
    if (isSubmitting || submissionState === "published") return;

    // Perform publication client validation first
    const validation = validateForPublish();
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

    let targetDraftId = savedDraftId;

    // Step 1: Create draft if not already created
    if (!targetDraftId) {
      setSubmissionState("creating_draft");
      try {
        const payload = constructPayload();
        const createdDraft = await createDraftJobPost(payload);
        targetDraftId = createdDraft.id;
        setSavedDraftId(createdDraft.id);
      } catch (createError: unknown) {
        setIsSubmitting(false);
        setSubmissionState("idle");
        const message = extractErrorMessage(
          createError,
          "Failed to create draft for publishing.",
        );
        await Swal.fire({
          title: "Draft Creation Failed",
          text: message,
          icon: "error",
          confirmButtonColor: "#1877f2",
        });
        return; // Halt: Do not attempt publishing
      }
    }

    // Step 2: Publish the draft using the stored/resolved draft ID
    setSubmissionState("publishing");
    try {
      await publishJobPost(targetDraftId);
      setSubmissionState("published");

      await Swal.fire({
        title: "Job Posted Successfully!",
        text: "Your job post is now published and open for applicants.",
        icon: "success",
        confirmButtonText: "Go to Dashboard",
        confirmButtonColor: "#1877f2",
        allowOutsideClick: false,
      });

      void navigate("/recruiter/dashboard");
    } catch (publishError: unknown) {
      // Retain the created draft ID! Do not erase it.
      setSubmissionState("publish_failed");
      const message = extractErrorMessage(
        publishError,
        "Draft was saved, but publishing failed.",
      );
      await Swal.fire({
        title: "Publication Failed",
        html: `Your draft was created (ID: <code class="text-xs bg-slate-100 p-1 rounded font-mono">${targetDraftId}</code>), but publishing failed:<br/><br/><strong>${message}</strong><br/><br/><p class="text-xs text-slate-500">Your draft has been preserved. You can click "Retry Publishing" to publish this draft now.</p>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Retry Publishing",
        cancelButtonText: "Close",
        confirmButtonColor: "#1877f2",
        cancelButtonColor: "#64748b",
      }).then((res) => {
        if (res.isConfirmed) {
          void handlePostJobNow();
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Dirty Check & Cancel Navigation
  // ----------------------------------------------------
  const isDirty = Boolean(
    title.trim() ||
    categoryId ||
    description.trim() ||
    selectedSkillIds.length > 0 ||
    startDate ||
    jobLocation.trim() ||
    workersNeeded !== 1 ||
    budgetAmount !== "" ||
    hourlyRate !== "",
  );

  const handleCancel = async () => {
    if (!isDirty || submissionState === "published") {
      void navigate("/recruiter/dashboard");
      return;
    }

    const result = await Swal.fire({
      title: "Discard job post draft?",
      text: savedDraftId
        ? "Your draft has already been saved to the database. Leaving will exit this form."
        : "You have unsaved form details that will be lost.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, exit",
      cancelButtonText: "Continue editing",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (result.isConfirmed) {
      void navigate("/recruiter/dashboard");
    }
  };

  // Lock form inputs when draft has been saved or job is published to prevent silent divergence
  const isFormLocked = Boolean(savedDraftId || submissionState === "published");

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      {/* Left Navigation Sidebar */}
      <RecruiterSidebar activeTab="post-job" />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-8 space-y-6">
          {/* Page Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Post a New Gig
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Provide details about your project to attract the right talent.
            </p>
          </div>

          {/* Saved Draft Lock Banner */}
          {savedDraftId && submissionState !== "published" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 flex items-start gap-3 shadow-2xs">
              <Lock className="w-5 h-5 text-[#1877f2] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-900">
                <p className="font-semibold">
                  Draft Saved in Database:{" "}
                  <code className="bg-white/80 px-1.5 py-0.5 rounded text-blue-950 font-mono text-xs">
                    {savedDraftId}
                  </code>
                </p>
                <p className="mt-1 text-blue-700">
                  This draft is securely saved. In the current release, saved
                  drafts cannot be edited once saved. Click{" "}
                  <strong>Post Job Now</strong> below to publish this draft, or
                  return to your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Published State Banner */}
          {submissionState === "published" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-start gap-3 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-emerald-900">
                <p className="font-semibold">
                  Job Post Published Successfully!
                </p>
                <p className="mt-0.5 text-emerald-700">
                  This job post is active. Returning to your dashboard...
                </p>
              </div>
            </div>
          )}

          {/* Global Empty Category State Banner */}
          {!isLoadingCategories &&
            !categoriesError &&
            categories.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-800">
                  <p className="font-semibold">
                    No job categories are currently available
                  </p>
                  <p className="mt-0.5 text-amber-700">
                    The platform category catalog is currently empty. Job
                    posting requires a valid category, so form submission will
                    be enabled once categories are seeded.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void loadCategories();
                    }}
                    className="inline-flex items-center gap-1.5 mt-2 font-semibold text-amber-900 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check again</span>
                  </button>
                </div>
              </div>
            )}

          {/* Four Modular Form Sections */}
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
              disabled={isFormLocked}
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
              disabled={isFormLocked}
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
              disabled={isFormLocked}
            />

            {/* 4. Budget & Payment */}
            <BudgetPaymentSection
              paymentStructure={paymentStructure}
              onChangePaymentStructure={handlePaymentStructureChange}
              budgetAmount={budgetAmount}
              onChangeBudgetAmount={setBudgetAmount}
              hourlyRate={hourlyRate}
              onChangeHourlyRate={setHourlyRate}
              disabled={isFormLocked}
            />

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-4 pb-12 border-t border-slate-200/80">
              {/* Save Draft Action */}
              <button
                type="button"
                onClick={() => {
                  void handleSaveDraft();
                }}
                disabled={isSubmitting || Boolean(savedDraftId)}
                title={
                  savedDraftId
                    ? "Draft is already saved in the database"
                    : "Save draft to database"
                }
                className={`text-xs sm:text-sm font-semibold transition-colors px-2 py-2 ${
                  savedDraftId
                    ? "text-slate-400 cursor-not-allowed select-none"
                    : isSubmitting
                      ? "text-slate-400 cursor-wait select-none"
                      : "text-slate-600 hover:text-slate-900 cursor-pointer"
                }`}
              >
                {submissionState === "creating_draft" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Draft...</span>
                  </span>
                ) : savedDraftId ? (
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Draft Saved</span>
                  </span>
                ) : (
                  "Save Draft"
                )}
              </button>

              {/* Cancel and Post Job Now Actions */}
              <div className="flex items-center gap-3">
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
                    void handlePostJobNow();
                  }}
                  disabled={
                    isSubmitting ||
                    submissionState === "published" ||
                    (categories.length === 0 && !isLoadingCategories)
                  }
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1565cc] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors ${
                    isSubmitting ||
                    submissionState === "published" ||
                    (categories.length === 0 && !isLoadingCategories)
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {submissionState === "creating_draft" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Draft...</span>
                    </span>
                  ) : submissionState === "publishing" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </span>
                  ) : submissionState === "publish_failed" ? (
                    <>
                      <span>Retry Post Job Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : submissionState === "published" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Published</span>
                    </span>
                  ) : (
                    <>
                      <span>Post Job Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PostJob;
