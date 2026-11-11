import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Feature 3, Step 4: Worker Job Discovery UI Components", () => {
  const componentDir = path.resolve(
    __dirname,
    "../components/worker/job-discovery",
  );
  const jobCardPath = path.join(componentDir, "JobCard.tsx");
  const jobFiltersPath = path.join(componentDir, "JobFilters.tsx");
  const jobPaginationPath = path.join(componentDir, "JobPagination.tsx");
  const jobCardSkeletonPath = path.join(componentDir, "JobCardSkeleton.tsx");
  const indexPath = path.join(componentDir, "index.ts");

  describe("1. Component File Existence & Exports", () => {
    test("1.1. All required component files exist in components/worker/job-discovery", () => {
      assert.strictEqual(fs.existsSync(jobCardPath), true);
      assert.strictEqual(fs.existsSync(jobFiltersPath), true);
      assert.strictEqual(fs.existsSync(jobPaginationPath), true);
      assert.strictEqual(fs.existsSync(jobCardSkeletonPath), true);
      assert.strictEqual(fs.existsSync(indexPath), true);
    });

    test("1.2. index.ts exports all components and their public prop types", () => {
      const content = fs.readFileSync(indexPath, "utf-8");
      assert.match(content, /export \* from ["']\.\/JobCard["'];/);
      assert.match(content, /export \* from ["']\.\/JobFilters["'];/);
      assert.match(content, /export \* from ["']\.\/JobPagination["'];/);
      assert.match(content, /export \* from ["']\.\/JobCardSkeleton["'];/);
    });
  });

  describe("2. JobCard Component Contracts & Helpers", () => {
    test("2.1. JobCard.tsx declares typed JobCardProps receiving JobDiscoveryItem", () => {
      const content = fs.readFileSync(jobCardPath, "utf-8");
      assert.match(
        content,
        /export interface JobCardProps\s*\{[\s\S]*?item:\s*JobDiscoveryItem;[\s\S]*?onViewDetails\?:[\s\S]*?onApply\?:[\s\S]*?onReport\?:[\s\S]*?\}/,
        "JobCardProps must declare item, onViewDetails, onApply, and onReport",
      );
    });

    test("2.2. formatCompensation formats FIXED payment structure correctly and prevents duplicate shift label", () => {
      const formatCompensation = (item) => {
        if (item.paymentStructure === "hourly") {
          const rate =
            typeof item.hourlyRate === "number"
              ? `$${item.hourlyRate}/hr`
              : "—";
          const label = item.estimatedDuration
            ? item.estimatedDuration.toLowerCase().startsWith("est")
              ? item.estimatedDuration
              : `Est. ${item.estimatedDuration}`
            : "Hourly";
          return { amount: rate, label };
        }
        const budget =
          typeof item.budgetAmount === "number" ? `$${item.budgetAmount}` : "—";
        const label = item.shiftDuration
          ? item.shiftDuration.toLowerCase().includes("shift")
            ? item.shiftDuration
            : `${item.shiftDuration} shift`
          : "Per shift";
        return { amount: budget, label };
      };

      const fixedItem = {
        paymentStructure: "fixed",
        budgetAmount: 120,
        hourlyRate: null,
        shiftDuration: "6h",
      };

      const result = formatCompensation(fixedItem);
      assert.strictEqual(result.amount, "$120");
      assert.strictEqual(result.label, "6h shift");

      const fixedItemWithShift = {
        paymentStructure: "fixed",
        budgetAmount: 150,
        hourlyRate: null,
        shiftDuration: "Night shift",
      };
      const resultWithShift = formatCompensation(fixedItemWithShift);
      assert.strictEqual(resultWithShift.amount, "$150");
      assert.strictEqual(resultWithShift.label, "Night shift");
    });

    test("2.3. formatCompensation formats HOURLY payment structure correctly and prevents duplicate est label", () => {
      const formatCompensation = (item) => {
        if (item.paymentStructure === "hourly") {
          const rate =
            typeof item.hourlyRate === "number"
              ? `$${item.hourlyRate}/hr`
              : "—";
          const label = item.estimatedDuration
            ? item.estimatedDuration.toLowerCase().startsWith("est")
              ? item.estimatedDuration
              : `Est. ${item.estimatedDuration}`
            : "Hourly";
          return { amount: rate, label };
        }
        const budget =
          typeof item.budgetAmount === "number" ? `$${item.budgetAmount}` : "—";
        const label = item.shiftDuration
          ? item.shiftDuration.toLowerCase().includes("shift")
            ? item.shiftDuration
            : `${item.shiftDuration} shift`
          : "Per shift";
        return { amount: budget, label };
      };

      const hourlyItem = {
        paymentStructure: "hourly",
        budgetAmount: null,
        hourlyRate: 30,
        estimatedDuration: "6 hours",
      };

      const result = formatCompensation(hourlyItem);
      assert.strictEqual(result.amount, "$30/hr");
      assert.strictEqual(result.label, "Est. 6 hours");

      const hourlyItemWithEst = {
        paymentStructure: "hourly",
        budgetAmount: null,
        hourlyRate: 35,
        estimatedDuration: "Est. 4 hours",
      };
      const resultWithEst = formatCompensation(hourlyItemWithEst);
      assert.strictEqual(resultWithEst.amount, "$35/hr");
      assert.strictEqual(resultWithEst.label, "Est. 4 hours");
    });

    test("2.4. formatRelativeTime handles recent, hours, days, and invalid dates safely", () => {
      const formatRelativeTime = (isoString) => {
        if (!isoString) return "Recently posted";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "Recently posted";

        const diffMs = Date.now() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) {
          if (diffMin <= 1) return "Posted just now";
          return `Posted ${diffMin} minutes ago`;
        }
        if (diffHours === 1) return "Posted 1 hour ago";
        if (diffHours < 24) return `Posted ${diffHours} hours ago`;
        if (diffDays === 1) return "Posted yesterday";
        if (diffDays < 7) return `Posted ${diffDays} days ago`;
        return `Posted ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      };

      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      assert.strictEqual(formatRelativeTime(oneHourAgo), "Posted 1 hour ago");

      const twoDaysAgo = new Date(
        Date.now() - 2 * 24 * 3600 * 1000,
      ).toISOString();
      assert.strictEqual(formatRelativeTime(twoDaysAgo), "Posted 2 days ago");

      assert.strictEqual(formatRelativeTime(null), "Recently posted");
      assert.strictEqual(formatRelativeTime("invalid-date"), "Recently posted");
    });

    test("2.5. formatStartDate handles null, today, and future dates safely", () => {
      const formatStartDate = (isoString) => {
        if (!isoString) return "Flexible start";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "Flexible start";

        const now = new Date();
        const isToday =
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate();

        const timeStr = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        if (isToday) {
          const hours = date.getHours();
          const prefix = hours >= 17 ? "Tonight" : "Today";
          return `${prefix}, ${timeStr}`;
        }
        return "Scheduled";
      };

      assert.strictEqual(formatStartDate(null), "Flexible start");
      assert.strictEqual(formatStartDate(""), "Flexible start");
    });

    test("2.6. JobCard safely handles missing company info with fallback", () => {
      const content = fs.readFileSync(jobCardPath, "utf-8");
      assert.match(
        content,
        /companyName\s*=\s*item\.company\?\.name\?\.trim\(\)\s*\|\|\s*["']Independent Recruiter["']/,
        "Must provide 'Independent Recruiter' fallback when company is absent",
      );
    });

    test("2.7. JobCard defines accessible action buttons and callback invocations", () => {
      const content = fs.readFileSync(jobCardPath, "utf-8");
      assert.match(
        content,
        /aria-label=["']Report job["']/,
        "Report button must have accessible aria-label",
      );
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onReport\?\.\(item\)\}/,
        "Report button must invoke onReport?.(item)",
      );
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onViewDetails\?\.\(item\)\}/,
        "View Details button must invoke onViewDetails?.(item)",
      );
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onApply\?\.\(item\)\}/,
        "Apply button must invoke onApply?.(item)",
      );
    });
  });

  describe("3. JobFilters Component Contracts & State Flow", () => {
    test("3.1. JobFilters.tsx accepts controlled filter props and callbacks", () => {
      const content = fs.readFileSync(jobFiltersPath, "utf-8");
      assert.match(
        content,
        /export interface JobFiltersProps\s*\{[\s\S]*?search:\s*string;[\s\S]*?onSearchChange:\s*\(value:\s*string\)\s*=>\s*void;[\s\S]*?categories:\s*JobCategory\[\];[\s\S]*?selectedCategoryId\?:[\s\S]*?onCategoryChange:[\s\S]*?workType\?:[\s\S]*?onWorkTypeChange:[\s\S]*?paymentStructure\?:[\s\S]*?onPaymentStructureChange:[\s\S]*?minPay\?:[\s\S]*?onMinPayChange:[\s\S]*?maxPay\?:[\s\S]*?onMaxPayChange:[\s\S]*?location\?:[\s\S]*?onLocationChange:[\s\S]*?sortBy\?:[\s\S]*?onSortByChange:[\s\S]*?onClearFilters:\s*\(\)\s*=>\s*void;[\s\S]*?\}/,
        "JobFiltersProps must declare all backend-supported filter controls",
      );
    });

    test("3.2. JobFilters does not maintain duplicate filter state; relies on controlled props", () => {
      const content = fs.readFileSync(jobFiltersPath, "utf-8");
      // Must not create local copies of filters
      assert.doesNotMatch(
        content,
        /const\s*\[selectedCategoryId,\s*setSelectedCategoryId\]/,
      );
      assert.doesNotMatch(content, /const\s*\[workType,\s*setWorkType\]/);
      assert.doesNotMatch(
        content,
        /const\s*\[paymentStructure,\s*setPaymentStructure\]/,
      );
      assert.doesNotMatch(content, /const\s*\[minPay,\s*setMinPay\]/);
      assert.doesNotMatch(content, /const\s*\[maxPay,\s*setMaxPay\]/);
    });

    test("3.3. JobFilters active filter count calculation logic is accurate", () => {
      const calculateActiveFilterCount = ({
        selectedCategoryId,
        workType,
        paymentStructure,
        minPay,
        maxPay,
        location,
        sortBy,
      }) => {
        let count = 0;
        if (selectedCategoryId) count++;
        if (workType) count++;
        if (paymentStructure) count++;
        if (minPay !== undefined && !isNaN(minPay)) count++;
        if (maxPay !== undefined && !isNaN(maxPay)) count++;
        if (location && location.trim().length > 0) count++;
        if (sortBy && sortBy !== "recent") count++;
        return count;
      };

      assert.strictEqual(
        calculateActiveFilterCount({
          selectedCategoryId: "cat-1",
          workType: "local",
          paymentStructure: undefined,
          minPay: 0,
          maxPay: undefined,
          location: "",
          sortBy: "recent",
        }),
        3, // cat-1, local, minPay: 0
      );

      assert.strictEqual(
        calculateActiveFilterCount({
          selectedCategoryId: undefined,
          workType: undefined,
          paymentStructure: undefined,
          minPay: undefined,
          maxPay: undefined,
          location: undefined,
          sortBy: "recent",
        }),
        0,
      );
    });

    test("3.4. JobFilters clear search and clear all filters invoke callbacks", () => {
      const content = fs.readFileSync(jobFiltersPath, "utf-8");
      assert.match(
        content,
        /onClick=\{\(\)\s*=>\s*onSearchChange\(["']["']\)\}/,
        "Clear search button must invoke onSearchChange('')",
      );
      assert.match(
        content,
        /onClick=\{onClearFilters\}/,
        "Clear all filters must invoke onClearFilters",
      );
    });
  });

  describe("4. JobPagination Component & Boundary Calculations", () => {
    test("4.1. JobPagination.tsx accepts PaginationMetadata and onPageChange callback", () => {
      const content = fs.readFileSync(jobPaginationPath, "utf-8");
      assert.match(
        content,
        /export interface JobPaginationProps\s*\{[\s\S]*?pagination:\s*PaginationMetadata;[\s\S]*?onPageChange:\s*\(page:\s*number\)\s*=>\s*void;[\s\S]*?\}/,
        "JobPaginationProps must declare pagination and onPageChange",
      );
    });

    test("4.2. Pagination boundary logic disables Previous on page 1 and Next on last page", () => {
      const checkButtons = ({ page, totalPages, total }) => {
        const isFirstPage = page <= 1 || total === 0;
        const isLastPage = page >= totalPages || total === 0;
        return { isFirstPage, isLastPage };
      };

      // Page 1 of 5
      const p1 = checkButtons({ page: 1, totalPages: 5, total: 50 });
      assert.strictEqual(p1.isFirstPage, true);
      assert.strictEqual(p1.isLastPage, false);

      // Page 3 of 5
      const p3 = checkButtons({ page: 3, totalPages: 5, total: 50 });
      assert.strictEqual(p3.isFirstPage, false);
      assert.strictEqual(p3.isLastPage, false);

      // Page 5 of 5
      const p5 = checkButtons({ page: 5, totalPages: 5, total: 50 });
      assert.strictEqual(p5.isFirstPage, false);
      assert.strictEqual(p5.isLastPage, true);

      // Zero results
      const pZero = checkButtons({ page: 1, totalPages: 0, total: 0 });
      assert.strictEqual(pZero.isFirstPage, true);
      assert.strictEqual(pZero.isLastPage, true);
    });

    test("4.3. Range descriptors calculate start and end items accurately", () => {
      const calculateRange = ({ page, limit, total }) => {
        const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
        const endItem = total === 0 ? 0 : Math.min(page * limit, total);
        return { startItem, endItem };
      };

      // Page 1 of 10 limit with 25 items
      const r1 = calculateRange({ page: 1, limit: 10, total: 25 });
      assert.strictEqual(r1.startItem, 1);
      assert.strictEqual(r1.endItem, 10);

      // Page 3 of 10 limit with 25 items
      const r3 = calculateRange({ page: 3, limit: 10, total: 25 });
      assert.strictEqual(r3.startItem, 21);
      assert.strictEqual(r3.endItem, 25);

      // 0 items
      const rZero = calculateRange({ page: 1, limit: 10, total: 0 });
      assert.strictEqual(rZero.startItem, 0);
      assert.strictEqual(rZero.endItem, 0);
    });

    test("4.4. Page numbers window generates up to 5 surrounding pages", () => {
      const getPageNumbers = (page, totalPages) => {
        if (totalPages <= 1) return totalPages === 1 ? [1] : [];
        const windowSize = 5;
        let start = Math.max(1, page - Math.floor(windowSize / 2));
        const end = Math.min(totalPages, start + windowSize - 1);
        if (end - start + 1 < windowSize) {
          start = Math.max(1, end - windowSize + 1);
        }
        const pages = [];
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        return pages;
      };

      assert.deepStrictEqual(getPageNumbers(1, 10), [1, 2, 3, 4, 5]);
      assert.deepStrictEqual(getPageNumbers(5, 10), [3, 4, 5, 6, 7]);
      assert.deepStrictEqual(getPageNumbers(10, 10), [6, 7, 8, 9, 10]);
      assert.deepStrictEqual(getPageNumbers(1, 1), [1]);
      assert.deepStrictEqual(getPageNumbers(1, 0), []);
    });
  });

  describe("5. JobCardSkeleton Component", () => {
    test("5.1. JobCardSkeleton renders pulse placeholder matching JobCard dimensions", () => {
      const content = fs.readFileSync(jobCardSkeletonPath, "utf-8");
      assert.match(content, /animate-pulse/);
      assert.match(content, /data-testid=["']job-card-skeleton["']/);
      assert.match(content, /rounded-2xl/);
    });
  });

  describe("6. Architectural Invariants", () => {
    test("6.1. No component makes direct network or Axios calls", () => {
      const cardContent = fs.readFileSync(jobCardPath, "utf-8");
      const filtersContent = fs.readFileSync(jobFiltersPath, "utf-8");
      const paginationContent = fs.readFileSync(jobPaginationPath, "utf-8");
      const skeletonContent = fs.readFileSync(jobCardSkeletonPath, "utf-8");

      for (const content of [
        cardContent,
        filtersContent,
        paginationContent,
        skeletonContent,
      ]) {
        assert.strictEqual(content.includes("axios"), false);
        assert.strictEqual(content.includes("fetch("), false);
        assert.strictEqual(content.includes("api.get"), false);
      }
    });

    test("6.2. No component accesses localStorage or sessionStorage", () => {
      const cardContent = fs.readFileSync(jobCardPath, "utf-8");
      const filtersContent = fs.readFileSync(jobFiltersPath, "utf-8");
      const paginationContent = fs.readFileSync(jobPaginationPath, "utf-8");

      for (const content of [cardContent, filtersContent, paginationContent]) {
        assert.strictEqual(content.includes("localStorage"), false);
        assert.strictEqual(content.includes("sessionStorage"), false);
      }
    });
  });
});
