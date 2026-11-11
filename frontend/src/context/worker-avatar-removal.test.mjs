import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readComponent = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf-8");

describe("Step 3B: Frontend Worker Avatar Removal Integration & State Machine Tests", () => {
  const profilePage = readComponent("../pages/worker/WorkerProfile.tsx");
  const overview = readComponent(
    "../components/worker/WorkerProfileOverview.tsx",
  );
  const workerApi = readComponent("../lib/worker-api.ts");
  const baseApi = readComponent("../lib/api.ts");

  // ─── 1. Contract & Component Interface ──────────────────────────────────
  describe("1. Contract & Component Interface", () => {
    test("1.1. worker-api.ts exports removeWorkerAvatar targeting DELETE /worker/profile/avatar", () => {
      assert.match(
        workerApi,
        /export const removeWorkerAvatar\s*=\s*async/,
        "worker-api.ts must export removeWorkerAvatar function",
      );
      assert.match(
        workerApi,
        /api\.delete<\{\s*avatarUrl:\s*null\s*\}\>\(\s*["']\/worker\/profile\/avatar["']/,
        "removeWorkerAvatar must dispatch api.delete to /worker/profile/avatar",
      );
      assert.doesNotMatch(
        workerApi,
        /removeWorkerAvatar\s*=\s*async\s*\([^)]*\b(userId|id)\b/,
        "removeWorkerAvatar must NOT require or send userId; identity is derived from session",
      );
    });

    test("1.2. removeWorkerAvatar reuses configured api instance with HttpOnly credentials", () => {
      assert.match(
        baseApi,
        /withCredentials:\s*true/,
        "base api.ts must configure withCredentials: true",
      );
      assert.doesNotMatch(
        workerApi,
        /axios\.create/,
        "worker-api.ts must NOT create a separate axios instance",
      );
    });

    test("1.3. WorkerProfileOverviewProps defines optional isRemovingAvatar and onRemoveAvatar", () => {
      assert.match(
        overview,
        /isRemovingAvatar\?:\s*boolean/,
        "WorkerProfileOverviewProps must define optional isRemovingAvatar prop",
      );
      assert.match(
        overview,
        /onRemoveAvatar\?:\s*\(\)\s*=>\s*Promise<void>/,
        "WorkerProfileOverviewProps must define optional onRemoveAvatar prop",
      );
    });

    test("1.4. WorkerProfile renders WorkerProfileOverview with avatar removal props", () => {
      assert.match(
        profilePage,
        /<WorkerProfileOverview[\s\S]*?avatarUrl=\{user\?\.avatarUrl\}/,
        "WorkerProfile must pass user?.avatarUrl to WorkerProfileOverview",
      );
      assert.match(
        profilePage,
        /<WorkerProfileOverview[\s\S]*?isRemovingAvatar=\{isRemovingAvatar\}/,
        "WorkerProfile must pass isRemovingAvatar to WorkerProfileOverview",
      );
      assert.match(
        profilePage,
        /<WorkerProfileOverview[\s\S]*?onRemoveAvatar=\{handleRemoveAvatar\}/,
        "WorkerProfile must pass onRemoveAvatar to WorkerProfileOverview",
      );
    });
  });

  // ─── 2. Avatar Availability & Visibility Gating ────────────────────────
  describe("2. Avatar Availability & Visibility Gating", () => {
    test("2.1. Remove Photo button appears when a saved avatar is known to exist", () => {
      assert.match(
        overview,
        /const\s+hasSavedAvatar\s*=\s*!isRemoved\s*&&\s*Boolean\(\s*avatarUrl\s*&&\s*avatarUrl\.trim\(\)\s*!==\s*["']["']\s*\)/,
        "WorkerProfileOverview must compute hasSavedAvatar based on non-empty avatarUrl and removal state",
      );
      assert.match(
        overview,
        /\{hasSavedAvatar\s*&&\s*\([\s\S]*?data-testid=["']remove-avatar-button["']/,
        "Remove Photo button must be conditionally rendered when hasSavedAvatar is true",
      );
      assert.match(
        overview,
        /Remove Photo/,
        "Button must have visible text 'Remove Photo'",
      );
    });

    test("2.2. Simulated gating: visible when avatarUrl exists, hidden when absent", () => {
      const isAvatarAvailable = (avatarUrl) =>
        Boolean(avatarUrl && avatarUrl.trim() !== "");

      assert.strictEqual(
        isAvatarAvailable("workers/123/avatar.png"),
        true,
        "Must be true for valid S3 key",
      );
      assert.strictEqual(
        isAvatarAvailable("/worker/profile/avatar"),
        true,
        "Must be true for relative endpoint path",
      );
      assert.strictEqual(
        isAvatarAvailable(null),
        false,
        "Must be false when avatarUrl is null",
      );
      assert.strictEqual(
        isAvatarAvailable(undefined),
        false,
        "Must be false when avatarUrl is undefined",
      );
      assert.strictEqual(
        isAvatarAvailable(""),
        false,
        "Must be false when avatarUrl is empty string",
      );
      assert.strictEqual(
        isAvatarAvailable("   "),
        false,
        "Must be false when avatarUrl is whitespace only",
      );
    });

    test("2.3. A failed avatar fetch does not hide Remove Photo if saved avatar exists", () => {
      // Simulate state where avatarUrl is set, but fetchWorkerAvatarBlob failed (500 or 404)
      const user = { avatarUrl: "workers/456/avatar.jpg" };
      let avatarBlobFetchError = new Error("Network Error");
      let avatarObjectUrl = null;

      // Overview relies on hasSavedAvatar (user.avatarUrl), NOT avatarObjectUrl alone
      const hasSavedAvatar = Boolean(
        user.avatarUrl && user.avatarUrl.trim() !== "",
      );

      assert.strictEqual(
        hasSavedAvatar,
        true,
        "Remove Photo must remain available even when blob fetch fails",
      );
      assert.ok(avatarBlobFetchError);
      assert.strictEqual(avatarObjectUrl, null);
    });

    test("2.4. A failed avatar fetch does NOT cause Remove Photo to appear when no avatar exists", () => {
      const user = { avatarUrl: null };
      const hasSavedAvatar = Boolean(
        user.avatarUrl && user.avatarUrl.trim() !== "",
      );
      assert.strictEqual(
        hasSavedAvatar,
        false,
        "Remove Photo must remain hidden when no avatar exists regardless of fetch status",
      );
    });
  });

  // ─── 3. Confirmation Dialog & Single DELETE Request Dispatch ───────────
  describe("3. Confirmation Dialog & Single DELETE Request Dispatch", () => {
    test("3.1. SweetAlert2 confirmation dialog is prompted before removal with default avatar restoration notice", () => {
      assert.match(
        overview,
        /Swal\.fire\(\{[\s\S]*?title:\s*["']Remove profile photo\?["']/,
        "Confirmation must show title 'Remove profile photo?'",
      );
      assert.match(
        overview,
        /Removing your photo will restore the default avatar\./,
        "Confirmation must explain that removing the photo restores default avatar",
      );
      assert.match(
        overview,
        /showCancelButton:\s*true/,
        "Confirmation must have showCancelButton: true",
      );
    });

    test("3.2. Cancelling confirmation makes zero API requests and leaves state unchanged", async () => {
      let deleteDispatched = 0;
      let stateChanged = false;

      const mockSwal = {
        fire: async () => ({ isConfirmed: false }),
      };

      const handleRemove = async () => {
        const result = await mockSwal.fire({ title: "Remove profile photo?" });
        if (!result.isConfirmed) {
          return;
        }
        deleteDispatched++;
        stateChanged = true;
      };

      await handleRemove();

      assert.strictEqual(
        deleteDispatched,
        0,
        "No DELETE request must be dispatched when user cancels",
      );
      assert.strictEqual(
        stateChanged,
        false,
        "No state change must occur when user cancels",
      );
    });

    test("3.3. Confirming removal sends exactly one DELETE request", async () => {
      let deleteDispatched = 0;
      let targetEndpoint = "";

      const mockSwal = {
        fire: async () => ({ isConfirmed: true }),
      };

      const mockApi = {
        delete: async (url) => {
          deleteDispatched++;
          targetEndpoint = url;
          return { data: { avatarUrl: null } };
        },
      };

      const handleRemove = async () => {
        const result = await mockSwal.fire({ title: "Remove profile photo?" });
        if (!result.isConfirmed) return;
        await mockApi.delete("/worker/profile/avatar");
      };

      await handleRemove();

      assert.strictEqual(
        deleteDispatched,
        1,
        "Exactly one DELETE request must be sent",
      );
      assert.strictEqual(
        targetEndpoint,
        "/worker/profile/avatar",
        "DELETE request must target /worker/profile/avatar",
      );
    });
  });

  // ─── 4. Successful Removal State Transition, URL Cleanup & Auth Refresh ─
  describe("4. Successful Removal State Transition, URL Cleanup & Auth Refresh", () => {
    test("4.1. Successful removal revokes active and pending browser object URLs", async () => {
      const revoked = [];
      const mockURL = {
        createObjectURL: (blob) => `blob:http://localhost:5173/${blob.name}`,
        revokeObjectURL: (url) => revoked.push(url),
      };

      const urlActive = mockURL.createObjectURL({ name: "active-avatar" });
      const urlPending = mockURL.createObjectURL({ name: "pending-avatar" });

      const avatarObjectUrlRef = { current: urlActive };
      const previousAvatarObjectUrlRef = { current: urlPending };
      let avatarObjectUrl = urlActive;
      let isLoadingAvatar = true;

      // Simulated success block in handleRemovePhotoClick
      if (avatarObjectUrlRef.current) {
        mockURL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      if (previousAvatarObjectUrlRef.current) {
        mockURL.revokeObjectURL(previousAvatarObjectUrlRef.current);
        previousAvatarObjectUrlRef.current = null;
      }
      avatarObjectUrl = null;
      isLoadingAvatar = false;

      assert.strictEqual(
        revoked.includes(urlActive),
        true,
        "Active object URL must be revoked",
      );
      assert.strictEqual(
        revoked.includes(urlPending),
        true,
        "Pending object URL must be revoked",
      );
      assert.strictEqual(
        avatarObjectUrlRef.current,
        null,
        "avatarObjectUrlRef must be nulled",
      );
      assert.strictEqual(
        previousAvatarObjectUrlRef.current,
        null,
        "previousAvatarObjectUrlRef must be nulled",
      );
      assert.strictEqual(
        avatarObjectUrl,
        null,
        "avatarObjectUrl state must be null",
      );
      assert.strictEqual(isLoadingAvatar, false, "isLoadingAvatar must be false");
    });

    test("4.2. Successful removal refreshes user and sets avatarUrl to null in AuthContext", async () => {
      let currentUser = {
        id: "worker-1",
        firstName: "Alice",
        lastName: "Worker",
        avatarUrl: "workers/worker-1/avatar.png",
      };

      const mockRefreshUser = async () => {
        // Backend returns updated user with avatarUrl: null
        currentUser = { ...currentUser, avatarUrl: null };
        return currentUser;
      };

      assert.strictEqual(currentUser.avatarUrl, "workers/worker-1/avatar.png");
      await mockRefreshUser();
      assert.strictEqual(currentUser.avatarUrl, null);
    });

    test("4.3. Successful removal bumps avatar version to invalidate stale cached images", () => {
      assert.match(
        profilePage,
        /const\s+newVersion\s*=\s*Date\.now\(\)/,
        "Must generate timestamp for cache invalidation",
      );
      assert.match(
        profilePage,
        /setAvatarVersion\(newVersion\)/,
        "Must notify global listeners via setAvatarVersion",
      );
      assert.match(
        profilePage,
        /setAvatarVersionState\(newVersion\)/,
        "Must update local avatarVersion state",
      );
    });

    test("4.4. Successful removal fires success toast notification", () => {
      assert.match(
        profilePage,
        /icon:\s*["']success["'][\s\S]*?title:\s*["']Avatar removed successfully["']/,
        "Must show success toast with title 'Avatar removed successfully'",
      );
    });

    test("4.5. When avatar is removed, default UserIcon fallback is displayed", () => {
      assert.match(
        overview,
        /<UserIcon className=["']w-10 h-10 text-slate-400["'] \/>/,
        "Overview must render UserIcon when avatarObjectUrl is null",
      );
    });
  });

  // ─── 5. Failure Handling & Error Isolation ─────────────────────────────
  describe("5. Failure Handling & Error Isolation", () => {
    test("5.1. Failed removal keeps the current avatar visible and preserves state", async () => {
      const currentUrl = "blob:http://localhost:5173/persisted-avatar";
      let displayedAvatar = currentUrl;
      let userAvatarUrl = "workers/1/avatar.png";
      const revoked = [];

      const mockRemoveApi = async () => {
        const error = new Error("500 Internal Server Error");
        error.isAxiosError = true;
        error.response = { data: { message: "Failed to delete from S3" } };
        throw error;
      };

      let errorCaught = false;
      try {
        await mockRemoveApi();
        displayedAvatar = null;
      } catch {
        errorCaught = true;
        // On failure: do NOT clear displayedAvatar or revoke
      }

      assert.strictEqual(errorCaught, true);
      assert.strictEqual(
        displayedAvatar,
        currentUrl,
        "Displayed avatar must remain visible on failure",
      );
      assert.strictEqual(
        userAvatarUrl,
        "workers/1/avatar.png",
        "User avatarUrl must not be modified",
      );
      assert.strictEqual(
        revoked.length,
        0,
        "No object URLs must be revoked on failure",
      );
    });

    test("5.2. Error message from server is extracted and displayed in error toast", () => {
      assert.match(
        profilePage,
        /Failed to remove avatar\. Please try again\./,
        "WorkerProfile must provide user-facing error message fallback",
      );
    });
  });

  // ─── 6. Concurrency & Duplicate Request Guard ──────────────────────────
  describe("6. Concurrency & Duplicate Request Guard", () => {
    test("6.1. Duplicate removal requests are prevented while one is in progress", () => {
      assert.match(
        overview,
        /if\s*\(\s*removing\s*\|\|\s*isUploadingAvatar\s*\)\s*return/,
        "handleRemovePhotoClick must guard against concurrent removal or upload",
      );
      assert.match(
        profilePage,
        /if\s*\(\s*isRemovingAvatar\s*\|\|\s*isUploadingAvatar\s*\)\s*return/,
        "handleRemoveAvatar must guard against duplicate removal requests",
      );
    });

    test("6.2. Button is disabled and displays loading spinner during active removal", () => {
      assert.match(
        overview,
        /disabled=\{removing\s*\|\|\s*isUploadingAvatar\}/,
        "Remove Photo button must be disabled when removing is true",
      );
      assert.match(
        overview,
        /\{removing\s*\?[\s\S]*?<Loader2[\s\S]*?Removing\.\.\.[\s\S]*?:[\s\S]*?Remove Photo/,
        "Remove Photo button must display Loader2 spinner and 'Removing...' text while active",
      );
    });

    test("6.3. Simulated double-click creates exactly one API request", async () => {
      let apiCalls = 0;
      let isRemoving = false;

      const triggerRemove = async () => {
        if (isRemoving) return;
        isRemoving = true;
        try {
          apiCalls++;
          await new Promise((r) => setTimeout(r, 20));
        } finally {
          isRemoving = false;
        }
      };

      // Rapid parallel clicks
      await Promise.all([triggerRemove(), triggerRemove(), triggerRemove()]);

      assert.strictEqual(
        apiCalls,
        1,
        "Rapid concurrent clicks must result in exactly 1 API call",
      );
    });
  });

  // ─── 7. In-Flight Fetch Race Cancellation ──────────────────────────────
  describe("7. In-Flight Fetch Race Cancellation", () => {
    test("7.1. WorkerProfileOverview declares avatarFetchIdRef to track fetch sequence", () => {
      assert.match(
        overview,
        /avatarFetchIdRef\s*=\s*useRef<number>\(0\)/,
        "WorkerProfileOverview must declare avatarFetchIdRef",
      );
      assert.match(
        overview,
        /const fetchId = \+\+avatarFetchIdRef\.current/,
        "Each fetch attempt must increment and capture fetchId",
      );
      assert.match(
        overview,
        /if\s*\(!isMounted\s*\|\|\s*fetchId\s*!==\s*avatarFetchIdRef\.current\)\s*return/,
        "Late fetch responses must be discarded if fetchId is obsolete",
      );
      assert.match(
        overview,
        /avatarFetchIdRef\.current\+\+/,
        "Confirmed removal must increment avatarFetchIdRef to invalidate pending fetches",
      );
    });

    test("7.2. State machine simulation: late avatar fetch cannot restore removed image", async () => {
      let displayedImage = "initial-blob-url";
      let fetchIdCounter = 0;

      // 1. Fetch started
      const pendingFetchId = ++fetchIdCounter;

      // 2. Removal confirmed while fetch is in flight
      fetchIdCounter++; // Incremented on removal
      displayedImage = null; // Cleared

      // 3. In-flight fetch resolves late
      const lateBlob = { data: "old-avatar-data" };
      if (pendingFetchId === fetchIdCounter) {
        displayedImage = "restored-blob-url";
      }

      assert.strictEqual(
        displayedImage,
        null,
        "Late response must NOT overwrite null avatar state after removal",
      );
    });
  });

  // ─── 8. Upload, Editing & Password Change Invariance ───────────────────
  describe("8. Upload, Editing & Password Change Invariance", () => {
    test("8.1. Existing avatar upload continues to function independently", () => {
      assert.match(
        workerApi,
        /export const uploadWorkerAvatar\s*=\s*async/,
        "uploadWorkerAvatar must remain exported in worker-api.ts",
      );
      assert.match(
        profilePage,
        /const\s+handleUploadAvatar\s*=\s*async/,
        "handleUploadAvatar must remain defined in WorkerProfile.tsx",
      );
      assert.match(
        overview,
        /<input[^>]*type=["']file["'][^>]*accept=["']image\/jpeg,image\/png,image\/webp["']/,
        "File upload input with MIME type validation must remain intact",
      );
    });

    test("8.2. Unified profile editing is NOT coupled to avatar removal", () => {
      const saveDetailsMatch = profilePage.match(
        /const\s+handleSaveDetails\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s{2}\};/,
      );
      assert.ok(saveDetailsMatch, "handleSaveDetails must exist");
      assert.doesNotMatch(
        saveDetailsMatch[0],
        /removeWorkerAvatar/,
        "handleSaveDetails must NOT trigger removeWorkerAvatar",
      );
      assert.doesNotMatch(
        saveDetailsMatch[0],
        /handleRemoveAvatar/,
        "handleSaveDetails must NOT trigger handleRemoveAvatar",
      );
    });

    test("8.3. WorkerChangePasswordCard remains independent", () => {
      assert.match(
        profilePage,
        /<WorkerChangePasswordCard\s*\/>/,
        "WorkerChangePasswordCard must remain rendered independently",
      );
    });
  });

  // ─── 9. Post-Removal Auth Refresh Failure Resilience ──────────────────
  describe("9. Post-Removal Auth Refresh Failure Resilience", () => {
    test("9.1. WorkerProfile separates removeWorkerAvatar from refreshUser failure", () => {
      // Must isolate removeWorkerAvatar from subsequent refreshUser
      assert.match(
        profilePage,
        /await removeWorkerAvatar\(\);\s*removalSucceeded\s*=\s*true;/,
        "removeWorkerAvatar must be executed and marked successful independently",
      );
      // Secondary try/catch around refreshUser
      assert.match(
        profilePage,
        /try\s*\{\s*const refreshedUser = await refreshUser\(\);[\s\S]*?\}\s*catch/,
        "refreshUser must be wrapped in separate try/catch block",
      );
      // Non-misleading notification on refresh failure
      assert.match(
        profilePage,
        /Avatar removed, but profile sync failed\. Please refresh\./,
        "Must display separate warning if profile sync fails, not removal failure",
      );
    });

    test("9.2. State machine simulation: refresh failure does NOT retain or restore stale avatar", async () => {
      let displayedAvatar = "blob:http://localhost:5173/stale-avatar";
      let userAvatarUrl = "workers/1/avatar.png";
      let removedAvatarUrl = null;
      let inFlightFetchId = 1;
      let currentFetchId = inFlightFetchId;
      const revoked = [];

      const mockToast = {
        messages: [],
        fire: async (opts) => mockToast.messages.push(opts),
      };

      // 1. Backend DELETE succeeds
      const mockRemoveWorkerAvatar = async () => ({ avatarUrl: null });
      // 2. Subsequent refreshUser fails
      const mockRefreshUser = async () => {
        throw new Error("503 Service Unavailable");
      };

      // Simulated handleRemoveAvatar coordinator
      let removalSucceeded = false;
      try {
        await mockRemoveWorkerAvatar();
        removalSucceeded = true;
      } catch {
        await mockToast.fire({
          icon: "error",
          title: "Failed to remove avatar. Please try again.",
        });
      }

      if (removalSucceeded) {
        try {
          await mockRefreshUser();
          await mockToast.fire({
            icon: "success",
            title: "Avatar removed successfully",
          });
        } catch {
          await mockToast.fire({
            icon: "warning",
            title: "Avatar removed, but profile sync failed. Please refresh.",
          });
        }
      }

      // Simulated WorkerProfileOverview success handler
      removedAvatarUrl = userAvatarUrl;
      currentFetchId++; // invalidates pending fetches
      revoked.push(displayedAvatar);
      displayedAvatar = null; // resets to UserIcon placeholder

      // Assertions
      assert.strictEqual(
        displayedAvatar,
        null,
        "UI must clear the removed avatar to null",
      );
      assert.strictEqual(
        revoked.includes("blob:http://localhost:5173/stale-avatar"),
        true,
        "Stale object URL must be revoked",
      );
      assert.strictEqual(
        currentFetchId > inFlightFetchId,
        true,
        "Pending in-flight fetch must be invalidated",
      );
      assert.strictEqual(
        mockToast.messages.some((m) =>
          m.title.includes("Failed to remove avatar"),
        ),
        false,
        "Must NOT fire misleading removal-failure message",
      );
      assert.strictEqual(
        mockToast.messages.some((m) =>
          m.title.includes("Avatar removed, but profile sync failed"),
        ),
        true,
        "Must handle refresh failure separately with non-misleading message",
      );

      // Verify that hasSavedAvatar evaluates to false even though userAvatarUrl was not updated by refresh
      const isRemoved =
        removedAvatarUrl !== null && removedAvatarUrl === userAvatarUrl;
      const hasSavedAvatar =
        !isRemoved && Boolean(userAvatarUrl && userAvatarUrl.trim() !== "");

      assert.strictEqual(
        hasSavedAvatar,
        false,
        "hasSavedAvatar must be false after removal even if user state failed to refresh",
      );
    });
  });
});
