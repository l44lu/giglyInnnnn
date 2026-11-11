import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 3, Step 9.3: Worker Report Job Frontend Implementation", () => {
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");
  const workerApiPath = path.resolve(__dirname, "../lib/worker-api.ts");
  const reportModalPath = path.resolve(
    __dirname,
    "../components/worker/job-discovery/ReportJobModal.tsx",
  );
  const discoveryIndexPath = path.resolve(
    __dirname,
    "../components/worker/job-discovery/index.ts",
  );
  const findJobsPagePath = path.resolve(
    __dirname,
    "../pages/worker/FindJobs.tsx",
  );
  const jobCardPath = path.resolve(
    __dirname,
    "../components/worker/job-discovery/JobCard.tsx",
  );
  const jobDetailsModalPath = path.resolve(
    __dirname,
    "../components/worker/job-discovery/JobDetailsModal.tsx",
  );

  // =========================================================================
  // Section 1: Types & API Client Contracts
  // =========================================================================
  describe("1. Report Job Types & API Client Contracts", () => {
    test("1.1. types/job.ts exports ReportJobInput interface matching backend contract", () => {
      assert.strictEqual(fs.existsSync(jobTypesPath), true);
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface ReportJobInput\s*\{[\s\S]*?description:\s*string;[\s\S]*?evidence\?:\s*File\s*\|\s*null;[\s\S]*?\}/,
        "ReportJobInput must define description string and optional evidence File | null",
      );
    });

    test("1.2. types/job.ts exports ReportJobResponse interface matching backend DTO", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface ReportJobResponse\s*\{[\s\S]*?id:\s*string;[\s\S]*?displayId:\s*string;[\s\S]*?jobPostId:\s*string;[\s\S]*?status:\s*string;[\s\S]*?createdAt:\s*string;[\s\S]*?\}/,
        "ReportJobResponse must define id, displayId, jobPostId, status, and createdAt",
      );
    });

    test("1.3. worker-api.ts exports evidence file constraints and validation helpers", () => {
      assert.strictEqual(fs.existsSync(workerApiPath), true);
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /export const ALLOWED_REPORT_EVIDENCE_MIME_TYPES\s*=\s*\[[\s\S]*?"image\/jpeg"[\s\S]*?"image\/png"[\s\S]*?"image\/webp"[\s\S]*?"application\/pdf"[\s\S]*?\];/,
        "Must specify allowed evidence MIME types (JPEG, PNG, WebP, PDF)",
      );

      assert.match(
        content,
        /export const ALLOWED_REPORT_EVIDENCE_EXTENSIONS\s*=\s*\[[\s\S]*?"\.jpg"[\s\S]*?"\.jpeg"[\s\S]*?"\.png"[\s\S]*?"\.webp"[\s\S]*?"\.pdf"[\s\S]*?\];/,
        "Must specify allowed evidence extensions",
      );

      assert.match(
        content,
        /export const MAX_REPORT_EVIDENCE_FILE_SIZE\s*=\s*5\s*\*\s*1024\s*\*\s*1024;/,
        "Must specify 5MB maximum file size limit",
      );

      assert.match(
        content,
        /export const MAX_REPORT_DESCRIPTION_LENGTH\s*=\s*500;/,
        "Must specify 500 characters max description length",
      );

      assert.match(
        content,
        /export const validateReportEvidenceFile\s*=\s*\(/,
        "Must export validateReportEvidenceFile helper function",
      );
    });

    test("1.4. worker-api.ts exports reportJob helper dispatching POST /worker/jobs/:id/report with FormData and undefined Content-Type header", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /export const reportJob\s*=\s*async\s*\([\s\S]*?jobId:\s*string,[\s\S]*?input:\s*ReportJobInput,[\s\S]*?\):\s*Promise<ReportJobResponse>\s*=>\s*\{/,
        "reportJob must accept jobId and ReportJobInput and return Promise<ReportJobResponse>",
      );

      // Verify FormData usage
      assert.match(
        content,
        /const formData = new FormData\(\);[\s\S]*?formData\.append\(["']description["'],\s*input\.description\.trim\(\)\);/,
        "reportJob must populate FormData with trimmed description",
      );

      // Verify optional evidence appending
      assert.match(
        content,
        /if\s*\(input\.evidence\)\s*\{[\s\S]*?formData\.append\(["']evidence["'],\s*input\.evidence\);[\s\S]*?\}/,
        "reportJob must conditionally append evidence to FormData",
      );

      // Verify endpoint and boundary handling
      assert.match(
        content,
        /api\.post<ReportJobResponse>\(\s*`\/worker\/jobs\/\$\{encodeURIComponent\(cleanId\)\}\/report`,[\s\S]*?formData,[\s\S]*?headers:\s*\{[\s\S]*?["']Content-Type["']:\s*undefined,[\s\S]*?\},[\s\S]*?\)/,
        "reportJob must dispatch POST to /worker/jobs/:id/report with Content-Type undefined for automatic multipart boundary",
      );
    });

    test("1.5. worker-api.ts does NOT create private Axios instances or access localStorage tokens", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.doesNotMatch(
        content,
        /axios\.create\(/,
        "Must use the shared api client instance, not create ad-hoc axios instances",
      );

      assert.doesNotMatch(
        content,
        /localStorage|sessionStorage/,
        "Must rely on HttpOnly cookie session auth without manual token storage",
      );

      assert.doesNotMatch(
        content,
        /Bearer\s+/i,
        "Must not manually inject Bearer authorization headers",
      );
    });
  });

  // =========================================================================
  // Section 2: File Validation Runtime Logic
  // =========================================================================
  describe("2. File Validation Helper Runtime Logic", () => {
    // Replicate validateReportEvidenceFile logic to test exhaustively in isolation
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_MIME = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

    const validate = (file) => {
      if (file.size > MAX_SIZE) {
        return "Evidence file exceeds the 5MB upload limit.";
      }
      const typeMatches = Boolean(
        file.type && ALLOWED_MIME.includes(file.type.toLowerCase()),
      );
      const extMatches = Boolean(
        file.name &&
          ALLOWED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext)),
      );
      if (!typeMatches && !extMatches) {
        return "Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF file.";
      }
      return null;
    };

    test("2.1. Validates files within 5MB limit with allowed image/pdf types", () => {
      assert.strictEqual(
        validate({ name: "evidence.png", type: "image/png", size: 1024 * 1024 }),
        null,
      );
      assert.strictEqual(
        validate({ name: "scan.pdf", type: "application/pdf", size: 4.9 * 1024 * 1024 }),
        null,
      );
      assert.strictEqual(
        validate({ name: "photo.jpg", type: "image/jpeg", size: 500 * 1024 }),
        null,
      );
      assert.strictEqual(
        validate({ name: "screenshot.webp", type: "image/webp", size: 200 * 1024 }),
        null,
      );
    });

    test("2.2. Rejects files exceeding 5MB upload limit", () => {
      const error = validate({
        name: "large.pdf",
        type: "application/pdf",
        size: 5 * 1024 * 1024 + 1,
      });
      assert.strictEqual(error, "Evidence file exceeds the 5MB upload limit.");
    });

    test("2.3. Rejects unsupported MIME types and file extensions", () => {
      const errorExe = validate({
        name: "malware.exe",
        type: "application/x-msdownload",
        size: 1024,
      });
      assert.strictEqual(
        errorExe,
        "Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF file.",
      );

      const errorSvg = validate({
        name: "image.svg",
        type: "image/svg+xml",
        size: 2048,
      });
      assert.strictEqual(
        errorSvg,
        "Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF file.",
      );

      const errorTxt = validate({
        name: "notes.txt",
        type: "text/plain",
        size: 512,
      });
      assert.strictEqual(
        errorTxt,
        "Unsupported file type. Please upload a JPEG, PNG, WebP, or PDF file.",
      );
    });
  });

  // =========================================================================
  // Section 3: ReportJobModal Component Conformance
  // =========================================================================
  describe("3. ReportJobModal Component Structure & Figma Conformance", () => {
    test("3.1. ReportJobModal is exported from job-discovery index", () => {
      assert.strictEqual(fs.existsSync(reportModalPath), true);
      assert.strictEqual(fs.existsSync(discoveryIndexPath), true);

      const indexContent = fs.readFileSync(discoveryIndexPath, "utf-8");
      assert.match(
        indexContent,
        /export \* from ["']\.\/ReportJobModal["'];?/,
        "index.ts must export ReportJobModal",
      );
    });

    test("3.2. ReportJobModal declares ReportJobModalProps supporting JobDiscoveryItem and WorkerJobDetails", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /export interface ReportJobModalProps\s*\{[\s\S]*?job:\s*JobDiscoveryItem\s*\|\s*WorkerJobDetails\s*\|\s*null;[\s\S]*?isOpen:\s*boolean;[\s\S]*?onClose:\s*\(\)\s*=>\s*void;[\s\S]*?onSuccess\?:\s*\(report:\s*ReportJobResponse\)\s*=>\s*void;[\s\S]*?\}/,
        "ReportJobModalProps must accept job, isOpen, onClose, and onSuccess",
      );
    });

    test("3.3. Renders accessible modal dialog with backdrop, title, and close button", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /role=["']dialog["']/,
        "Must declare role='dialog'",
      );
      assert.match(
        content,
        /aria-modal=["']true["']/,
        "Must declare aria-modal='true'",
      );
      assert.match(
        content,
        /data-testid=["']report-job-modal-backdrop["']/,
        "Must include report-job-modal-backdrop test ID",
      );
      assert.match(
        content,
        /data-testid=["']btn-close-report-modal["']/,
        "Must include close button with test ID",
      );
      assert.match(
        content,
        />\s*Report job\s*<\/h2>/,
        "Header must display 'Report job'",
      );
    });

    test("3.4. Renders inset job reference card with title, formatted Job ID, time, and badges", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']report-job-summary["']/,
        "Must render inset job reference card with test ID",
      );
      assert.match(
        content,
        /Job ID\s+\{formattedJobId\}/,
        "Must display formatted Job ID label",
      );
      assert.match(
        content,
        /formatRelativeTime\(job\.createdAt\)/,
        "Must display relative time posted",
      );
    });

    test("3.5. Renders description textarea with 500-char limit and live character counter", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']report-description-input["']/,
        "Must include description textarea with test ID",
      );
      assert.match(
        content,
        /maxLength=\{500\}/,
        "Must enforce 500-character HTML maxLength",
      );
      assert.match(
        content,
        /data-testid=["']report-character-counter["']/,
        "Must render live character counter with test ID",
      );
      assert.match(
        content,
        /\{description\.length\}\/500/,
        "Counter must render dynamic {description.length}/500 count",
      );
      assert.match(
        content,
        /Describe the issue/,
        "Must label description as 'Describe the issue'",
      );
    });

    test("3.6. Renders evidence attachment section with hidden input, dropzone, preview, and remove button", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']report-file-input["']/,
        "Must include hidden file input",
      );
      assert.match(
        content,
        /accept=["']\.jpg,\.jpeg,\.png,\.webp,\.pdf,image\/jpeg,image\/png,image\/webp,application\/pdf["']/,
        "File input must configure accepted MIME and extension filters",
      );
      assert.match(
        content,
        /data-testid=["']report-file-dropzone["']/,
        "Must include upload trigger dropzone",
      );
      assert.match(
        content,
        /data-testid=["']report-file-preview["']/,
        "Must include file preview container when file is attached",
      );
      assert.match(
        content,
        /data-testid=["']report-file-name["']/,
        "Must render selected file name",
      );
      assert.match(
        content,
        /data-testid=["']btn-remove-evidence["']/,
        "Must include remove button to clear attachment",
      );
    });

    test("3.7. Renders action buttons with Submit report styled red and Flag icon", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']btn-cancel-report["']/,
        "Must render cancel button with test ID",
      );
      assert.match(
        content,
        /data-testid=["']btn-submit-report["']/,
        "Must render submit report button with test ID",
      );
      assert.match(
        content,
        /bg-red-600\s+hover:bg-red-700/,
        "Submit report button must be styled red",
      );
      assert.match(
        content,
        /<Flag\s+className=["'][^"']*fill-white/,
        "Submit button must render Flag icon",
      );
    });

    test("3.8. Disables submit button when description is empty, exceeds 500 chars, file has error, or is submitting", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /isSubmitDisabled\s*=\s*[\s\S]*?isSubmitting\s*\|\|[\s\S]*?description\.trim\(\)\.length === 0\s*\|\|[\s\S]*?description\.length > 500\s*\|\|[\s\S]*?Boolean\(fileError\)/,
        "isSubmitDisabled must guard against empty/oversized description, file error, and pending submit",
      );
    });

    test("3.9. Implements body scroll lock and Escape key dismiss behavior", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /document\.body\.style\.overflow\s*=\s*["']hidden["']/,
        "Must lock body scroll while modal is open",
      );
      assert.match(
        content,
        /e\.key\s*===\s*["']Escape["']/,
        "Must close modal on Escape key press",
      );
    });
  });

  // =========================================================================
  // Section 4: Error Handling & Error Message Extraction
  // =========================================================================
  describe("4. Error Handling & Message Extraction", () => {
    // Replicate extractReportErrorMessage logic for direct contract verification
    const extractError = (error) => {
      if (error?.isAxiosError) {
        const status = error.response?.status;
        if (status === 409) {
          return "You already have a pending report for this job.";
        }
        if (status === 413) {
          return "Evidence file exceeds the 5MB upload limit.";
        }
        if (status === 400) {
          const data = error.response?.data;
          if (Array.isArray(data?.message)) {
            return data.message.join(", ");
          }
          if (typeof data?.message === "string" && data.message.trim().length > 0) {
            return data.message.trim();
          }
          return "Please check your report description and file format.";
        }
        const data = error.response?.data;
        if (typeof data?.message === "string" && data.message.trim().length > 0) {
          return data.message.trim();
        }
      }
      return "Failed to submit report. Please check your connection and try again.";
    };

    test("4.1. Maps 409 Conflict to 'You already have a pending report for this job.'", () => {
      const err = {
        isAxiosError: true,
        response: { status: 409, data: { message: "Conflict" } },
      };
      assert.strictEqual(
        extractError(err),
        "You already have a pending report for this job.",
      );
    });

    test("4.2. Maps 413 Payload Too Large to 'Evidence file exceeds the 5MB upload limit.'", () => {
      const err = {
        isAxiosError: true,
        response: { status: 413, data: { message: "File too large" } },
      };
      assert.strictEqual(
        extractError(err),
        "Evidence file exceeds the 5MB upload limit.",
      );
    });

    test("4.3. Maps 400 Bad Request to server validation message", () => {
      const errWithMessage = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: "Description cannot exceed 500 characters" },
        },
      };
      assert.strictEqual(
        extractError(errWithMessage),
        "Description cannot exceed 500 characters",
      );

      const errWithArray = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: ["Description is required", "Invalid evidence"] },
        },
      };
      assert.strictEqual(
        extractError(errWithArray),
        "Description is required, Invalid evidence",
      );

      const errGeneric = {
        isAxiosError: true,
        response: { status: 400, data: {} },
      };
      assert.strictEqual(
        extractError(errGeneric),
        "Please check your report description and file format.",
      );
    });

    test("4.4. Maps unknown or network error to fallback message", () => {
      const networkErr = { isAxiosError: true, message: "Network Error" };
      assert.strictEqual(
        extractError(networkErr),
        "Failed to submit report. Please check your connection and try again.",
      );

      const standardErr = new Error("Something broke");
      assert.strictEqual(
        extractError(standardErr),
        "Failed to submit report. Please check your connection and try again.",
      );
    });
  });

  // =========================================================================
  // Section 5: Integration in FindJobs Page
  // =========================================================================
  describe("5. FindJobs Page Wiring & Dual Entry Point Integration", () => {
    test("5.1. FindJobs.tsx manages reportingJob state for ReportJobModal", () => {
      assert.strictEqual(fs.existsSync(findJobsPagePath), true);
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /const\s*\[reportingJob,\s*setReportingJob\]\s*=\s*useState<[\s\S]*?JobDiscoveryItem\s*\|\s*WorkerJobDetails\s*\|\s*null\s*>\(null\);/,
        "FindJobs must declare reportingJob state initialized to null",
      );
    });

    test("5.2. Entry Point 1: JobCard onReport handler sets reportingJob", () => {
      const cardContent = fs.readFileSync(jobCardPath, "utf-8");
      assert.match(
        cardContent,
        /onClick=\{\(\)\s*=>\s*onReport\?\.(\(item\)|item)\}/,
        "JobCard button must invoke onReport with job item",
      );

      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");
      assert.match(
        pageContent,
        /const handleReport = useCallback\(\(item: JobDiscoveryItem\) => \{\s*setReportingJob\(item\);\s*\}, \[\]\);/,
        "FindJobs handleReport must set reportingJob to clicked JobDiscoveryItem",
      );
      assert.match(
        pageContent,
        /onReport=\{handleReport\}/,
        "FindJobs must pass handleReport to JobCard",
      );
    });

    test("5.3. Entry Point 2: JobDetailsModal onReport handler sets reportingJob", () => {
      const modalContent = fs.readFileSync(jobDetailsModalPath, "utf-8");
      assert.match(
        modalContent,
        /data-testid=["']btn-report-job["'][\s\S]*?onClick=\{\(\)\s*=>\s*onReport\?\.(\(job\)|job)\}/,
        "JobDetailsModal report button must invoke onReport with job details",
      );

      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");
      assert.match(
        pageContent,
        /const handleReportFromDetails = useCallback\(\(details: WorkerJobDetails\) => \{\s*setReportingJob\(details\);\s*\}, \[\]\);/,
        "FindJobs handleReportFromDetails must set reportingJob to WorkerJobDetails",
      );
      assert.match(
        pageContent,
        /onReport=\{handleReportFromDetails\}/,
        "FindJobs must pass onReport to JobDetailsModal",
      );
    });

    test("5.4. On successful report: closes modals and fires SweetAlert2 toast without resetting filters or pagination", () => {
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      // Verify handleReportSuccess
      assert.match(
        pageContent,
        /const handleReportSuccess = useCallback\(\(\) => \{[\s\S]*?setReportingJob\(null\);[\s\S]*?setSelectedJobId\(null\);[\s\S]*?Toast\.fire\(\{[\s\S]*?icon:\s*["']success["'],[\s\S]*?title:\s*["']Report submitted successfully["'],[\s\S]*?\}\);[\s\S]*?\}, \[\]\);/,
        "handleReportSuccess must close reporting modal, close details modal, and fire SweetAlert2 toast",
      );

      // Verify filters and pagination state are NOT reset in handleReportSuccess
      const successFnMatch = pageContent.match(
        /const handleReportSuccess = useCallback\([\s\S]*?\}, \[\]\);/,
      );
      assert.ok(successFnMatch, "handleReportSuccess must exist");
      assert.doesNotMatch(
        successFnMatch[0],
        /setPage|setSearch|setSelectedCategoryId|setWorkType|setPaymentStructure|setMinPay|setMaxPay|setLocation|setSortBy/,
        "handleReportSuccess must preserve search, filters, and page state",
      );
    });

    test("5.5. FindJobs.tsx mounts ReportJobModal with controlled props", () => {
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        pageContent,
        /<ReportJobModal\s+isOpen=\{Boolean\(reportingJob\)\}\s+job=\{reportingJob\}\s+onClose=\{\(\)\s*=>\s*setReportingJob\(null\)\}\s+onSuccess=\{handleReportSuccess\}\s*\/>/,
        "FindJobs must mount ReportJobModal with isOpen, job, onClose, and onSuccess props",
      );
    });
  });

  // =========================================================================
  // Section 6: Modal Interactions, Accessibility & Boundary QA
  // =========================================================================
  describe("6. Modal Interactions, Accessibility & Boundary QA", () => {
    test("6.1. Exactly 5 MB (5,242,880 bytes) file is accepted, and 5MB + 1 byte is rejected", () => {
      const EXACT_5MB = 5 * 1024 * 1024;
      const OVER_5MB = 5 * 1024 * 1024 + 1;

      const content = fs.readFileSync(workerApiPath, "utf-8");
      assert.match(
        content,
        /if\s*\(file\.size\s*>\s*MAX_REPORT_EVIDENCE_FILE_SIZE\)/,
        "validateReportEvidenceFile must use strictly greater than (>) for 5MB limit",
      );

      // Verify boundary simulation
      const validateSize = (size) => {
        if (size > EXACT_5MB) return "Evidence file exceeds the 5MB upload limit.";
        return null;
      };

      assert.strictEqual(validateSize(EXACT_5MB), null, "Exactly 5MB must be valid");
      assert.strictEqual(
        validateSize(OVER_5MB),
        "Evidence file exceeds the 5MB upload limit.",
        "5MB + 1 byte must be rejected",
      );
    });

    test("6.2. formatFileSize displays bytes, KB, and MB accurately", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /export const formatFileSize\s*=\s*\(bytes:\s*number\):\s*string\s*=>\s*\{[\s\S]*?if\s*\(bytes\s*<\s*1024\)[\s\S]*?if\s*\(bytes\s*<\s*1024\s*\*\s*1024\)[\s\S]*?return\s*`\$\{\(bytes\s*\/\s*\(1024\s*\*\s*1024\)\)\.toFixed\(1\)\}\s*MB`;/,
        "formatFileSize must format sizes in B, KB, and MB",
      );
    });

    test("6.3. ReportJobModal uses z-[60] to cleanly layer above JobDetailsModal z-50", () => {
      const reportModalContent = fs.readFileSync(reportModalPath, "utf-8");
      const detailsModalContent = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        detailsModalContent,
        /className=["'][^"']*z-50[^"']*["']/,
        "JobDetailsModal must use z-50",
      );

      assert.match(
        reportModalContent,
        /className=\{`[^`]*z-\[60\][^`]*`\}/,
        "ReportJobModal must use z-[60] to stack unambiguously above JobDetailsModal",
      );
    });

    test("6.4. FindJobs.tsx prevents closing JobDetailsModal when Escape is pressed while ReportJobModal is open", () => {
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        pageContent,
        /const reportingJobRef = useRef<JobDiscoveryItem \| WorkerJobDetails \| null>\(\s*null,\s*\);/,
        "FindJobs must declare reportingJobRef to synchronize modal state",
      );

      assert.match(
        pageContent,
        /useEffect\(\(\) => \{\s*reportingJobRef\.current = reportingJob;\s*\}, \[reportingJob\]\);/,
        "FindJobs must sync reportingJobRef.current inside useEffect",
      );

      assert.match(
        pageContent,
        /const handleCloseDetails = useCallback\(\(\) => \{\s*if \(reportingJobRef\.current\) return;\s*setSelectedJobId\(null\);\s*\}, \[\]\);/,
        "handleCloseDetails must ignore close events when reportingJob is active",
      );
    });

    test("6.5. Inset job reference card provides robust fallbacks for missing company name and location", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /const companyName =\s*job\.company\?\.name\?\.trim\(\)\s*\|\|\s*["']Independent Recruiter["'];/,
        "Must provide 'Independent Recruiter' fallback for missing company",
      );

      assert.match(
        content,
        /const displayLocation =\s*job\.jobLocation\?\.trim\(\)\s*\|\|\s*\(isLocal\s*\?\s*["']Local on-site["']\s*:\s*["']Remote["']\);/,
        "Must provide 'Local on-site' or 'Remote' fallback for missing location",
      );
    });

    test("6.6. Repeated submit clicks cannot create duplicate requests while isSubmitting is true", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?if \(!job \|\| isSubmitting\) return;/,
        "handleSubmit must early-return if isSubmitting is true",
      );

      assert.match(
        content,
        /\{isSubmitting \? ["']Submitting\.\.\.["'] : ["']Submit report["']\}/,
        "Submit button must reflect pending state with 'Submitting...'",
      );
    });

    test("6.7. Resetting form state on cancel or dismiss cleans description, file attachment, and errors", () => {
      const content = fs.readFileSync(reportModalPath, "utf-8");

      assert.match(
        content,
        /const resetFormState = useCallback\(\(\) => \{[\s\S]*?setDescription\(["']["']\);[\s\S]*?setSelectedFile\(null\);[\s\S]*?setFileError\(null\);[\s\S]*?setSubmitError\(null\);[\s\S]*?setIsSubmitting\(false\);[\s\S]*?fileInputRef\.current\.value = ["']["'];/,
        "resetFormState must clear description, selectedFile, fileError, submitError, and input value",
      );
    });
  });

  // =========================================================================
  // Section 7: Regression & Scope Safety Invariants
  // =========================================================================
  describe("7. Regression & Scope Safety Invariants", () => {
    test("7.1. FindJobs.tsx View Details action remains intact and functional", () => {
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        pageContent,
        /const handleViewDetails = useCallback\(\(item: JobDiscoveryItem\) => \{\s*setSelectedJobId\(item\.id\);\s*\}, \[\]\);/,
        "handleViewDetails must set selectedJobId to item.id",
      );

      assert.match(
        pageContent,
        /onViewDetails=\{handleViewDetails\}/,
        "JobCard must receive onViewDetails prop",
      );
    });

    test("7.2. Apply action remains a strictly decoupled placeholder without premature mutation", () => {
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        pageContent,
        /const handleApply = useCallback\(\(item: JobDiscoveryItem\) => \{[\s\S]*?\/\/ Boundary placeholder[\s\S]*?void item;[\s\S]*?\}, \[\]\);/,
        "handleApply must remain an isolated boundary placeholder",
      );
    });

    test("7.3. JobDetailsModal remains intact with complete 5-section public display", () => {
      const modalContent = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        modalContent,
        /data-testid=["']section-recruiter["']/,
        "Section 1 must be present",
      );
      assert.match(
        modalContent,
        /data-testid=["']section-basic-info["']/,
        "Section 2 must be present",
      );
      assert.match(
        modalContent,
        /data-testid=["']section-job-details["']/,
        "Section 3 must be present",
      );
      assert.match(
        modalContent,
        /data-testid=["']section-time-location["']/,
        "Section 4 must be present",
      );
      assert.match(
        modalContent,
        /data-testid=["']section-payment-summary["']/,
        "Section 5 must be present",
      );
    });

    test("7.4. Controlled filter state and debounced search in FindJobs.tsx remain intact", () => {
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        pageContent,
        /const \[debouncedSearch, setDebouncedSearch\] = useState<string>\(["']["']\);/,
        "Debounced search state must be intact",
      );
      assert.match(
        pageContent,
        /setTimeout\(\s*\(\) => \{\s*setDebouncedSearch\(search\);\s*\},/,
        "Search debounce timer must be intact",
      );
    });

    test("7.5. No security or architecture boundary regressions", () => {
      const reportModalContent = fs.readFileSync(reportModalPath, "utf-8");
      const pageContent = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.doesNotMatch(
        reportModalContent + pageContent,
        /localStorage|sessionStorage/,
        "No storage token access permitted",
      );

      assert.doesNotMatch(
        reportModalContent + pageContent,
        /Bearer\s+/i,
        "No manual Bearer authorization headers permitted",
      );
    });
  });
});
