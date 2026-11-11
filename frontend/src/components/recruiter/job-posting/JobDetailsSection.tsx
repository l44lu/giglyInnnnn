import React, { useState, useRef, useEffect } from "react";
import { AlignLeft, X, Search, Plus, AlertCircle } from "lucide-react";
import type { Skill } from "@/types/worker-profile";

export interface JobDetailsSectionProps {
  description: string;
  onChangeDescription: (val: string) => void;
  selectedSkillIds: string[];
  onChangeSkillIds: (skillIds: string[]) => void;
  workersNeeded: number | "";
  onChangeWorkersNeeded: (val: number | "") => void;
  skillCatalog: Skill[];
  isLoadingSkills: boolean;
  skillsError: string | null;
  onRetrySkills?: () => void;
  disabled?: boolean;
}

export const JobDetailsSection: React.FC<JobDetailsSectionProps> = ({
  description,
  onChangeDescription,
  selectedSkillIds,
  onChangeSkillIds,
  workersNeeded,
  onChangeWorkersNeeded,
  skillCatalog,
  isLoadingSkills,
  skillsError,
  onRetrySkills,
  disabled = false,
}) => {
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const availableSkills = skillCatalog.filter(
    (s) =>
      !selectedSkillIds.includes(s.id) &&
      s.name.toLowerCase().includes(skillSearchQuery.trim().toLowerCase()),
  );

  const handleSelectSkill = (skill: Skill) => {
    if (!selectedSkillIds.includes(skill.id)) {
      onChangeSkillIds([...selectedSkillIds, skill.id]);
    }
    setSkillSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveSkill = (skillId: string) => {
    onChangeSkillIds(selectedSkillIds.filter((id) => id !== skillId));
  };

  const selectedSkills = selectedSkillIds
    .map((id) => skillCatalog.find((s) => s.id === id))
    .filter((s): s is Skill => Boolean(s));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1877f2]">
          <AlignLeft className="w-4 h-4 stroke-[2.2]" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          2. Job Details
        </h2>
      </div>

      {/* Job Description */}
      <div>
        <label
          htmlFor="job-description"
          className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
        >
          Job Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="job-description"
          rows={5}
          value={description}
          disabled={disabled}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Describe the work to be done, specific deliverables, required tools, and any background information..."
          className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-y leading-relaxed disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
      </div>

      {/* Required Skills & Requirements */}
      <div>
        <label
          htmlFor="skill-search-input"
          className="block text-xs sm:text-sm font-semibold text-slate-800"
        >
          Required Skills &amp; Requirements
        </label>
        <p className="text-xs text-slate-500 mt-0.5 mb-2.5">
          Add specific skills to help us match you with the best candidates.
        </p>

        {skillsError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-700 flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Could not load complete skill catalog.</span>
            </div>
            {onRetrySkills && (
              <button
                type="button"
                onClick={onRetrySkills}
                className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Selected Skill Tags and Search Input Container */}
        <div
          ref={dropdownRef}
          className="relative rounded-xl border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Selected Tags */}
            {selectedSkills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors"
              >
                <span>{skill.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemoveSkill(skill.id)}
                  aria-label={`Remove ${skill.name}`}
                  className="w-3.5 h-3.5 rounded hover:bg-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>
              </span>
            ))}

            {/* Inline Search Input */}
            <div className="flex-1 min-w-[180px] flex items-center gap-1.5 px-1 py-0.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                id="skill-search-input"
                type="text"
                disabled={disabled}
                value={skillSearchQuery}
                onFocus={() => {
                  if (!disabled) setIsDropdownOpen(true);
                }}
                onChange={(e) => {
                  setSkillSearchQuery(e.target.value);
                  if (!disabled) setIsDropdownOpen(true);
                }}
                placeholder={
                  disabled
                    ? "Skills locked"
                    : selectedSkills.length === 0
                      ? "Type a skill and select from catalog..."
                      : "Add another skill..."
                }
                className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-slate-200 shadow-lg max-h-52 overflow-y-auto py-1">
              {isLoadingSkills ? (
                <div className="px-4 py-3 text-xs text-slate-500 text-center">
                  Loading skills catalog...
                </div>
              ) : availableSkills.length > 0 ? (
                availableSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSelectSkill(skill)}
                    className="w-full px-3.5 py-2 text-left text-xs sm:text-sm text-slate-700 hover:bg-blue-50 hover:text-[#1877f2] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>{skill.name}</span>
                    <Plus className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 text-center">
                  {skillSearchQuery.trim()
                    ? `No matching catalog skills found for "${skillSearchQuery}"`
                    : "All catalog skills have been added."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Number of gigs / workers needed */}
      <div>
        <label
          htmlFor="workers-needed"
          className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
        >
          Number of gigs needed <span className="text-rose-500">*</span>
        </label>
        <input
          id="workers-needed"
          type="number"
          min={1}
          step={1}
          disabled={disabled}
          value={workersNeeded === "" ? "" : workersNeeded}
          onChange={(e) => {
            const val = e.target.value;
            onChangeWorkersNeeded(val === "" ? "" : Number(val));
          }}
          placeholder="e.g. at least One"
          className="w-full sm:w-64 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
};

export default JobDetailsSection;
