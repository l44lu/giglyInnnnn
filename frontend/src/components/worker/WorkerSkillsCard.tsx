import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { X, Plus } from "lucide-react";
import {
  getSkillCatalog,
  getWorkerSkills,
  updateWorkerSkills,
} from "@/lib/worker-api";
import type { Skill, WorkerSkill } from "@/types/worker-profile";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const WorkerSkillsCard: React.FC = () => {
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [skillsCatalog, setSkillsCatalog] = useState<Skill[]>([]);
  const [savedSkills, setSavedSkills] = useState<WorkerSkill[]>([]);
  const [draftSkillIds, setDraftSkillIds] = useState<string[]>([]);
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState<string>("");
  const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(true);
  const [isSavingSkills, setIsSavingSkills] = useState<boolean>(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skillsRetryCount, setSkillsRetryCount] = useState<number>(0);

  const catalogSkillMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const skill of skillsCatalog) {
      map.set(skill.id, skill.name);
    }
    return map;
  }, [skillsCatalog]);

  const availableCatalogOptions = useMemo(() => {
    const selectedSet = new Set(draftSkillIds);
    return skillsCatalog.filter((skill) => !selectedSet.has(skill.id));
  }, [skillsCatalog, draftSkillIds]);

  useEffect(() => {
    let isMounted = true;

    const fetchSkills = async () => {
      try {
        const [catalogData, workerSkillsData] = await Promise.all([
          getSkillCatalog(),
          getWorkerSkills(),
        ]);
        if (isMounted) {
          setSkillsCatalog(catalogData);
          setSavedSkills(workerSkillsData);
          setSkillsError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (axios.isAxiosError(err)) {
            const resData = err.response?.data as
              | { message?: string }
              | undefined;
            setSkillsError(
              resData?.message || "Failed to load skills. Please try again.",
            );
          } else {
            setSkillsError("Failed to load skills. Please try again.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingSkills(false);
        }
      }
    };

    void fetchSkills();

    return () => {
      isMounted = false;
    };
  }, [skillsRetryCount]);

  const handleRetrySkills = () => {
    if (isLoadingSkills) return;
    setSkillsError(null);
    setIsLoadingSkills(true);
    setSkillsRetryCount((prev) => prev + 1);
  };

  const handleStartEditingSkills = () => {
    if (isLoadingSkills) return;
    setDraftSkillIds(savedSkills.map((s) => s.skillId));
    setSelectedSkillToAdd("");
    setSkillsError(null);
    setIsEditingSkills(true);
  };

  const handleCancelSkills = () => {
    setDraftSkillIds(savedSkills.map((s) => s.skillId));
    setSelectedSkillToAdd("");
    setSkillsError(null);
    setIsEditingSkills(false);
  };

  const handleAddSkill = () => {
    if (!selectedSkillToAdd || isSavingSkills) return;
    if (draftSkillIds.includes(selectedSkillToAdd)) return;
    setDraftSkillIds((prev) => [...prev, selectedSkillToAdd]);
    setSelectedSkillToAdd("");
    setSkillsError(null);
  };

  const handleRemoveSkill = (skillIdToRemove: string) => {
    if (isSavingSkills) return;
    setDraftSkillIds((prev) => prev.filter((id) => id !== skillIdToRemove));
  };

  const handleSaveSkills = async () => {
    if (isSavingSkills) return;
    setIsSavingSkills(true);
    setSkillsError(null);

    try {
      const updatedSkills = await updateWorkerSkills(draftSkillIds);
      setSavedSkills(updatedSkills);
      setDraftSkillIds(updatedSkills.map((s) => s.skillId));
      setSelectedSkillToAdd("");
      setIsEditingSkills(false);
      void Toast.fire({
        icon: "success",
        title: "Skills updated successfully",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        setSkillsError(msg || "Failed to update skills. Please try again.");
      } else {
        setSkillsError("Failed to update skills. Please try again.");
      }
    } finally {
      setIsSavingSkills(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Skills
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            Highlight the work types and strengths clients most often search
            for.
          </p>
        </div>
        {!isEditingSkills ? (
          <button
            type="button"
            onClick={handleStartEditingSkills}
            disabled={isLoadingSkills}
            className="text-sm font-semibold text-[#1877f2] hover:text-[#166fe5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Edit skills"
          >
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelSkills}
              disabled={isSavingSkills}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/90 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              aria-label="Cancel skills editing"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSaveSkills();
              }}
              disabled={isSavingSkills}
              className="text-xs sm:text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              aria-label="Save skills"
            >
              {isSavingSkills ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {skillsError && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-2xs"
        >
          <span>{skillsError}</span>
          {isLoadingSkills ? (
            <button
              type="button"
              onClick={handleRetrySkills}
              className="text-red-700 hover:text-red-900 font-semibold underline text-xs ml-3 cursor-pointer shrink-0"
            >
              Retry
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSkillsError(null)}
              className="text-red-500 hover:text-red-700 text-xs font-semibold ml-3 cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {isLoadingSkills ? (
        <div
          data-testid="skills-loading"
          className="mt-5 flex items-center gap-2 text-xs text-slate-400"
        >
          <div className="w-4 h-4 border-2 border-[#1877f2] border-t-transparent rounded-full animate-spin" />
          <span>Loading skills...</span>
        </div>
      ) : (
        <div className="mt-5">
          <h4 className="text-xs font-bold text-slate-800 mb-2.5">
            Core skills
          </h4>

          {!isEditingSkills ? (
            savedSkills.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No skills added yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {savedSkills.map((ws) => (
                  <span
                    key={ws.id || ws.skillId}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs"
                  >
                    {ws.skillName}
                  </span>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-h-[46px]">
                {draftSkillIds.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    No skills selected. Add skills from the catalog below.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {draftSkillIds.map((skillId) => {
                      const skillName =
                        catalogSkillMap.get(skillId) ?? "Unknown Skill";
                      return (
                        <span
                          key={skillId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-[#1877f2] border border-blue-200/80 shadow-2xs"
                        >
                          <span>{skillName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skillId)}
                            disabled={isSavingSkills}
                            className="hover:text-red-600 transition-colors cursor-pointer"
                            aria-label={`Remove ${skillName}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <select
                  value={selectedSkillToAdd}
                  onChange={(e) => setSelectedSkillToAdd(e.target.value)}
                  disabled={
                    isSavingSkills || availableCatalogOptions.length === 0
                  }
                  className="w-full sm:w-auto sm:min-w-[260px] bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]/20 focus:border-[#1877f2] transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Select skill to add"
                >
                  <option value="">
                    {availableCatalogOptions.length === 0
                      ? "All available skills selected"
                      : "Select a skill to add..."}
                  </option>
                  {availableCatalogOptions.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!selectedSkillToAdd || isSavingSkills}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Add skill"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
