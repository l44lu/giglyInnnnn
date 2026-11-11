import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { X, Plus } from "lucide-react";
import { getSkillCatalog, getWorkerSkills } from "@/lib/worker-api";
import type { Skill, WorkerSkill } from "@/types/worker-profile";

export interface WorkerSkillsCardProps {
  skillsCatalog?: Skill[];
  savedSkills?: WorkerSkill[];
  draftSkillIds?: string[];
  onAddSkill?: (skillId: string) => void;
  onRemoveSkill?: (skillId: string) => void;
  isEditingDetails?: boolean;
  isSavingDetails?: boolean;
  isLoadingSkills?: boolean;
  skillsError?: string | null;
  onRetrySkills?: () => void;
}

export const WorkerSkillsCard: React.FC<WorkerSkillsCardProps> = ({
  skillsCatalog: propSkillsCatalog,
  savedSkills: propSavedSkills,
  draftSkillIds: propDraftSkillIds,
  onAddSkill,
  onRemoveSkill,
  isEditingDetails = false,
  isSavingDetails = false,
  isLoadingSkills: propIsLoadingSkills,
  skillsError: propSkillsError,
  onRetrySkills,
}) => {
  // Uncontrolled fallback states if rendered standalone
  const [localSkillsCatalog, setLocalSkillsCatalog] = useState<Skill[]>([]);
  const [localSavedSkills, setLocalSavedSkills] = useState<WorkerSkill[]>([]);
  const [localDraftSkillIds, setLocalDraftSkillIds] = useState<string[]>([]);
  const [localIsLoadingSkills, setLocalIsLoadingSkills] = useState<boolean>(
    propSavedSkills === undefined,
  );
  const [localSkillsError, setLocalSkillsError] = useState<string | null>(null);
  const [skillsRetryCount, setSkillsRetryCount] = useState<number>(0);

  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState<string>("");

  const skillsCatalog =
    propSkillsCatalog !== undefined ? propSkillsCatalog : localSkillsCatalog;
  const savedSkills =
    propSavedSkills !== undefined ? propSavedSkills : localSavedSkills;
  const draftSkillIds =
    propDraftSkillIds !== undefined ? propDraftSkillIds : localDraftSkillIds;
  const isLoadingSkills =
    propIsLoadingSkills !== undefined
      ? propIsLoadingSkills
      : localIsLoadingSkills;
  const skillsError =
    propSkillsError !== undefined ? propSkillsError : localSkillsError;

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

  // Fetch skills on mount if uncontrolled / not provided as props
  useEffect(() => {
    if (propSavedSkills !== undefined && propSkillsCatalog !== undefined) {
      return;
    }

    let isMounted = true;
    const fetchSkills = async () => {
      setLocalIsLoadingSkills(true);
      setLocalSkillsError(null);
      try {
        const [catalogData, workerSkillsData] = await Promise.all([
          getSkillCatalog(),
          getWorkerSkills(),
        ]);
        if (isMounted) {
          setLocalSkillsCatalog(catalogData);
          setLocalSavedSkills(workerSkillsData);
          setLocalDraftSkillIds(workerSkillsData.map((s) => s.skillId));
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (axios.isAxiosError(err)) {
            const resData = err.response?.data as
              | { message?: string }
              | undefined;
            setLocalSkillsError(
              resData?.message || "Failed to load skills. Please try again.",
            );
          } else {
            setLocalSkillsError("Failed to load skills. Please try again.");
          }
        }
      } finally {
        if (isMounted) {
          setLocalIsLoadingSkills(false);
        }
      }
    };

    void fetchSkills();

    return () => {
      isMounted = false;
    };
  }, [propSavedSkills, propSkillsCatalog, skillsRetryCount]);

  const handleRetrySkills = () => {
    if (onRetrySkills) {
      onRetrySkills();
      return;
    }
    if (isLoadingSkills) return;
    setLocalSkillsError(null);
    setLocalIsLoadingSkills(true);
    setSkillsRetryCount((prev) => prev + 1);
  };

  const handleAddSkill = () => {
    if (!selectedSkillToAdd || isSavingDetails) return;
    if (draftSkillIds.includes(selectedSkillToAdd)) return;

    if (onAddSkill) {
      onAddSkill(selectedSkillToAdd);
    } else {
      setLocalDraftSkillIds((prev) => [...prev, selectedSkillToAdd]);
    }
    setSelectedSkillToAdd("");
  };

  const handleRemoveSkill = (skillIdToRemove: string) => {
    if (isSavingDetails) return;
    if (onRemoveSkill) {
      onRemoveSkill(skillIdToRemove);
    } else {
      setLocalDraftSkillIds((prev) =>
        prev.filter((id) => id !== skillIdToRemove),
      );
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
      </div>

      {skillsError && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-2xs"
        >
          <span>{skillsError}</span>
          <button
            type="button"
            onClick={handleRetrySkills}
            className="text-red-700 hover:text-red-900 font-semibold underline text-xs ml-3 cursor-pointer shrink-0"
          >
            Retry
          </button>
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

          {!isEditingDetails ? (
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
                            disabled={isSavingDetails}
                            className="hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
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
                    isSavingDetails || availableCatalogOptions.length === 0
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
                  disabled={!selectedSkillToAdd || isSavingDetails}
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

export default WorkerSkillsCard;
