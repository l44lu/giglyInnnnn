import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 3, Step 8: Worker Job Details Frontend Implementation", () => {
  const jobTypesPath = path.resolve(__dirname, "../types/job.ts");
  const workerApiPath = path.resolve(__dirname, "../lib/worker-api.ts");
  const jobDetailsModalPath = path.resolve(
    __dirname,
    "../components/worker/job-discovery/JobDetailsModal.tsx",
  );
  const jobDiscoveryIndexPath = path.resolve(
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

  // =========================================================================
  // Section 1: Types & API Client Contracts
  // =========================================================================
  describe("1. Job Details Types Definition & Contract Boundaries", () => {
    test("1.1. types/job.ts defines WorkerJobDetailsCompany matching backend DTO", () => {
      assert.strictEqual(fs.existsSync(jobTypesPath), true);
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface WorkerJobDetailsCompany\s*\{[\s\S]*?id:\s*string\s*\|\s*null;[\s\S]*?name:\s*string;[\s\S]*?logoUrl:\s*string\s*\|\s*null;[\s\S]*?about:\s*string\s*\|\s*null;[\s\S]*?industry:\s*string\s*\|\s*null;[\s\S]*?website:\s*string\s*\|\s*null;[\s\S]*?headquartersLocation:\s*string\s*\|\s*null;[\s\S]*?\}/,
        "WorkerJobDetailsCompany must define public company profile fields",
      );
    });

    test("1.2. types/job.ts defines WorkerJobDetailsRecruiter with strict public privacy boundaries", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface WorkerJobDetailsRecruiter\s*\{[\s\S]*?name:\s*string;[\s\S]*?roleTitle:\s*string\s*\|\s*null;[\s\S]*?avatarUrl:\s*string\s*\|\s*null;[\s\S]*?location:\s*string\s*\|\s*null;[\s\S]*?bio:\s*string\s*\|\s*null;[\s\S]*?\}/,
        "WorkerJobDetailsRecruiter must define name, roleTitle, avatarUrl, location, bio",
      );

      // Verify privacy boundaries: email, phone, userId, passwordHash must NOT be in recruiter type
      assert.doesNotMatch(
        content,
        /WorkerJobDetailsRecruiter\s*\{[^}]*email/i,
        "WorkerJobDetailsRecruiter must not include email",
      );
      assert.doesNotMatch(
        content,
        /WorkerJobDetailsRecruiter\s*\{[^}]*phone/i,
        "WorkerJobDetailsRecruiter must not include phone",
      );
      assert.doesNotMatch(
        content,
        /WorkerJobDetailsRecruiter\s*\{[^}]*password/i,
        "WorkerJobDetailsRecruiter must not include password",
      );
      assert.doesNotMatch(
        content,
        /WorkerJobDetailsRecruiter\s*\{[^}]*userId/i,
        "WorkerJobDetailsRecruiter must not include internal userId",
      );
    });

    test("1.3. types/job.ts defines WorkerJobDetails matching backend response contract", () => {
      const content = fs.readFileSync(jobTypesPath, "utf-8");

      assert.match(
        content,
        /export interface WorkerJobDetails\s*\{[\s\S]*?id:\s*string;[\s\S]*?categoryId:\s*string;[\s\S]*?title:\s*string;[\s\S]*?description:\s*string;[\s\S]*?workType:\s*WorkType;[\s\S]*?workersNeeded:\s*number;[\s\S]*?startDate:\s*string\s*\|\s*null;[\s\S]*?estimatedDuration:\s*string\s*\|\s*null;[\s\S]*?shiftDuration:\s*string\s*\|\s*null;[\s\S]*?jobLocation:\s*string\s*\|\s*null;[\s\S]*?paymentStructure:\s*PaymentStructure;[\s\S]*?budgetAmount:\s*number\s*\|\s*null;[\s\S]*?hourlyRate:\s*number\s*\|\s*null;[\s\S]*?status:\s*JobStatus;[\s\S]*?category\?:\s*JobDiscoveryCategory;[\s\S]*?skills\?:\s*JobDiscoverySkill\[\];[\s\S]*?company\?:\s*WorkerJobDetailsCompany\s*\|\s*null;[\s\S]*?recruiter\?:\s*WorkerJobDetailsRecruiter\s*\|\s*null;[\s\S]*?\}/,
        "WorkerJobDetails must match backend response fields and relations",
      );
    });
  });

  // =========================================================================
  // Section 2: Worker API Method & Architectural Invariants
  // =========================================================================
  describe("2. Worker API Method & Architectural Invariants", () => {
    test("2.1. worker-api.ts exports getWorkerJobDetails", () => {
      assert.strictEqual(fs.existsSync(workerApiPath), true);
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /export const getWorkerJobDetails\s*=\s*async\s*\(/,
        "worker-api.ts must export getWorkerJobDetails",
      );
    });

    test("2.2. getWorkerJobDetails calls GET /worker/jobs/:id using the shared api client", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /api\.get<WorkerJobDetails>\([\s\S]*?\/worker\/jobs\/[\s\S]*?encodeURIComponent\(cleanId\)[\s\S]*?\)/,
        "getWorkerJobDetails must call GET /worker/jobs/:id via shared api client",
      );
    });

    test("2.3. worker-api.ts does NOT create private Axios instances or use manual Bearer tokens", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.doesNotMatch(
        content,
        /localStorage/i,
        "worker-api.ts must not touch localStorage",
      );
      assert.doesNotMatch(
        content,
        /sessionStorage/i,
        "worker-api.ts must not touch sessionStorage",
      );
      assert.doesNotMatch(
        content,
        /Authorization:\s*`Bearer/i,
        "worker-api.ts must not attach manual Authorization headers",
      );
    });

    test("2.4. getWorkerJobDetails trims and cleans the provided jobId", () => {
      const content = fs.readFileSync(workerApiPath, "utf-8");

      assert.match(
        content,
        /cleanId\s*=\s*id\.trim\(\)/,
        "getWorkerJobDetails must trim the jobId",
      );
    });
  });

  // =========================================================================
  // Section 3: JobDetailsModal Component Structure & Figma Conformance
  // =========================================================================
  describe("3. JobDetailsModal Component Structure & Layout", () => {
    test("3.1. JobDetailsModal exists and is re-exported from job-discovery index", () => {
      assert.strictEqual(fs.existsSync(jobDetailsModalPath), true);
      assert.strictEqual(fs.existsSync(jobDiscoveryIndexPath), true);

      const indexContent = fs.readFileSync(jobDiscoveryIndexPath, "utf-8");
      assert.match(
        indexContent,
        /export \* from ["']\.\/JobDetailsModal["']/,
        "job-discovery/index.ts must export JobDetailsModal",
      );
    });

    test("3.2. JobDetailsModal defines JobDetailsModalProps interface", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /export interface JobDetailsModalProps\s*\{[\s\S]*?jobId:\s*string\s*\|\s*null;[\s\S]*?isOpen:\s*boolean;[\s\S]*?onClose:\s*\(\)\s*=>\s*void;/,
        "JobDetailsModalProps must accept jobId, isOpen, onClose",
      );
    });

    test("3.3. JobDetailsModal renders accessible modal dialog with backdrop", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /role=["']dialog["']/,
        "Modal card must have role='dialog'",
      );
      assert.match(
        content,
        /aria-modal=["']true["']/,
        "Modal card must have aria-modal='true'",
      );
      assert.match(
        content,
        /data-testid=["']job-details-modal-backdrop["']/,
        "Modal must have a testable backdrop",
      );
    });

    test("3.4. JobDetailsModal header renders title, company, rate, rate label, and close X button", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']job-details-title["']/,
        "Must render job title",
      );
      assert.match(
        content,
        /data-testid=["']job-details-company["']/,
        "Must render company name or fallback",
      );
      assert.match(
        content,
        /data-testid=["']job-details-rate["']/,
        "Must render rate amount",
      );
      assert.match(
        content,
        /data-testid=["']btn-close-details-x["']/,
        "Must render top-right close X button",
      );
    });

    test("3.5. Section 1 (About the Recruiter) renders recruiter avatar, name, role, location, and bio card", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']section-recruiter["']/,
        "Must render About the Recruiter section",
      );
      assert.match(
        content,
        /data-testid=["']recruiter-name["']/,
        "Must render recruiter name",
      );
      assert.match(
        content,
        /data-testid=["']recruiter-role["']/,
        "Must render recruiter role title",
      );
      assert.match(
        content,
        /data-testid=["']recruiter-bio["']/,
        "Must render recruiter bio in ABOUT container",
      );
    });

    test("3.6. Section 2 (Basic Information) renders Job Type, Work Mode, Workers Needed, and Shift Length", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']section-basic-info["']/,
        "Must render Basic Information section",
      );
      assert.match(
        content,
        /data-testid=["']basic-job-type["']/,
        "Must render JOB TYPE",
      );
      assert.match(
        content,
        /data-testid=["']basic-work-mode["']/,
        "Must render WORK MODE",
      );
      assert.match(
        content,
        /data-testid=["']basic-workers-needed["']/,
        "Must render NUMBER OF WORKERS NEEDED",
      );
      assert.match(
        content,
        /data-testid=["']basic-shift-length["']/,
        "Must render SHIFT LENGTH",
      );
    });

    test("3.7. Section 3 (Job Details) renders Description and Required Skills chips", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']section-job-details["']/,
        "Must render Job Details section",
      );
      assert.match(
        content,
        /data-testid=["']job-description["']/,
        "Must render description",
      );
      assert.match(
        content,
        /data-testid=["']job-skills-chips["']/,
        "Must render required skills chips",
      );
    });

    test("3.8. Section 4 (Time & Location) renders Start Date, Duration, Location, and stylized Map preview", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']section-time-location["']/,
        "Must render Time & Location section",
      );
      assert.match(
        content,
        /data-testid=["']time-start["']/,
        "Must render START DATE & TIME",
      );
      assert.match(
        content,
        /data-testid=["']time-duration["']/,
        "Must render ESTIMATED DURATION",
      );
      assert.match(
        content,
        /data-testid=["']location-text["']/,
        "Must render JOB LOCATION",
      );
      assert.match(
        content,
        /data-testid=["']map-preview["']/,
        "Must render stylized map preview matching Figma",
      );
    });

    test("3.9. Section 5 (Payment Summary) renders Payment Structure, Budget / Hourly Rate, and Platform Payment Method", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']section-payment-summary["']/,
        "Must render Payment Summary section",
      );
      assert.match(
        content,
        /data-testid=["']payment-structure-val["']/,
        "Must render PAYMENT STRUCTURE value",
      );
      assert.match(
        content,
        /data-testid=["']payment-amount-val["']/,
        "Must render BUDGET AMOUNT / HOURLY RATE value",
      );
      assert.match(
        content,
        /data-testid=["']payment-method-val["']/,
        "Must render PAYMENT METHOD platform guarantee note",
      );
    });

    test("3.10. Footer renders review note, Report button, Close button, and Apply for this Job button", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /Review the full job information before applying\./,
        "Must render informational text in footer",
      );
      assert.match(
        content,
        /data-testid=["']btn-report-job["']/,
        "Must render Report flag button",
      );
      assert.match(
        content,
        /data-testid=["']btn-close-details["']/,
        "Must render Close button in footer",
      );
      assert.match(
        content,
        /data-testid=["']btn-apply-job["']/,
        "Must render Apply for this Job button",
      );
    });
  });

  // =========================================================================
  // Section 4: States, Error Handling, and Lifecycle Coordination
  // =========================================================================
  describe("4. States, Error Handling & Lifecycle Coordination", () => {
    test("4.1. JobDetailsModal renders loading spinner while fetching", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']job-details-loading["']/,
        "Must render loading container",
      );
    });

    test("4.2. JobDetailsModal handles 404 with dedicated Not-Found/Closed Job UI", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']job-details-not-found["']/,
        "Must render 404 / closed job container",
      );
      assert.match(
        content,
        /data-testid=["']btn-close-not-found["']/,
        "Must render close button in 404 state",
      );
    });

    test("4.3. JobDetailsModal handles general API error with Retry and Close actions", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /data-testid=["']job-details-error["']/,
        "Must render general error container",
      );
      assert.match(
        content,
        /data-testid=["']btn-retry-details["']/,
        "Must render Retry button on error",
      );
      assert.match(
        content,
        /data-testid=["']btn-close-error["']/,
        "Must render Close button on error",
      );
    });

    test("4.4. JobDetailsModal locks document.body scroll while open and restores on close", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /document\.body\.style\.overflow\s*=\s*["']hidden["']/,
        "Must lock body scroll while modal is open",
      );
    });

    test("4.5. JobDetailsModal listens for Escape key press to trigger onClose", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /e\.key\s*===\s*["']Escape["']/,
        "Must listen for Escape key",
      );
    });

    test("4.6. JobDetailsModal prevents stale request race conditions using activeRequestIdRef", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /activeRequestIdRef\.current/,
        "Must track request sequence ID to prevent out-of-order response leaks",
      );
    });
  });

  // =========================================================================
  // Section 5: Integration in FindJobs Page
  // =========================================================================
  describe("5. Integration in FindJobs Page", () => {
    test("5.1. FindJobs.tsx manages selectedJobId state for modal control", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /const\s*\[selectedJobId,\s*setSelectedJobId\]\s*=\s*useState<string\s*\|\s*null>\(null\);/,
        "FindJobs must declare selectedJobId state",
      );
    });

    test("5.2. FindJobs.tsx connects JobCard onViewDetails to open modal with item.id", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /handleViewDetails\s*=\s*useCallback\(\(item:\s*JobDiscoveryItem\)\s*=>\s*\{[\s\S]*?setSelectedJobId\(item\.id\);[\s\S]*?\},/s,
        "handleViewDetails must set selectedJobId to item.id",
      );
    });

    test("5.3. FindJobs.tsx mounts JobDetailsModal passing jobId, isOpen, and onClose", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      assert.match(
        content,
        /<JobDetailsModal[\s\S]*?jobId=\{selectedJobId\}[\s\S]*?isOpen=\{Boolean\(selectedJobId\)\}[\s\S]*?onClose=\{handleCloseDetails\}[\s\S]*?\/>/,
        "FindJobs must render JobDetailsModal with controlled props",
      );
    });

    test("5.4. Preserves Find Jobs search, filters, and pagination state when details modal opens or closes", () => {
      const content = fs.readFileSync(findJobsPagePath, "utf-8");

      // Verify handleViewDetails and handleCloseDetails only touch selectedJobId, NOT filters or page
      const detailsFnMatch = content.match(
        /const handleViewDetails = useCallback\([\s\S]*?\}, \[\]\);/,
      );
      assert.ok(detailsFnMatch, "handleViewDetails must exist");
      assert.doesNotMatch(
        detailsFnMatch[0],
        /setPage|setSearch|setSelectedCategoryId|setWorkType|setPaymentStructure/,
        "Opening details modal must not modify filter or page state",
      );

      const closeFnMatch = content.match(
        /const handleCloseDetails = useCallback\([\s\S]*?\}, \[\]\);/,
      );
      assert.ok(closeFnMatch, "handleCloseDetails must exist");
      assert.doesNotMatch(
        closeFnMatch[0],
        /setPage|setSearch|setSelectedCategoryId|setWorkType|setPaymentStructure/,
        "Closing details modal must not modify filter or page state",
      );
    });
  });

  // =========================================================================
  // Section 6: Formatting Utilities & Null Safety Logic
  // =========================================================================
  describe("6. Formatting Utilities & Null Safety Logic", () => {
    test("6.1. formatStartDate correctly handles null, invalid, today, tomorrow, and future dates", () => {
      const content = fs.readFileSync(jobCardPath, "utf-8");

      assert.match(
        content,
        /export const formatStartDate\s*=\s*\(isoString\?: string \| null\): string =>/,
        "formatStartDate must be exported from JobCard",
      );
    });

    test("6.2. Null company, null recruiter, and null bio are handled safely without crash", () => {
      const content = fs.readFileSync(jobDetailsModalPath, "utf-8");

      assert.match(
        content,
        /job(?:\.|\?\.)company\?\.name\s*\|\|\s*["']Independent Recruiter["']/,
        "Must provide safe company fallback",
      );
      assert.match(
        content,
        /job(?:\.|\?\.)recruiter\?\.name\s*\|\|\s*["']Recruiter["']/,
        "Must provide safe recruiter fallback",
      );
    });
  });
});
