import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  FileText,
  Plus,
  Loader2,
} from "lucide-react";
import {
  getRecruiterCompany,
  fetchRecruiterCompanyLogoBlob,
  getLogoVersion,
} from "@/lib/recruiter-api";
import type { Company } from "@/types/recruiter-profile";

export const COMPANY_NAME_REQUIRED_ERROR = "Company name is required.";

export interface RecruiterCompanyCardProps {
  company?: Company | null;
  initialCompany?: Company | null;
  onCompanyChange?: (company: Company | null) => void;
  isEditingDetails?: boolean;
  isSavingDetails?: boolean;
  name?: string;
  onChangeName?: (value: string) => void;
  industry?: string;
  onChangeIndustry?: (value: string) => void;
  companySize?: string;
  onChangeCompanySize?: (value: string) => void;
  website?: string;
  onChangeWebsite?: (value: string) => void;
  headquartersLocation?: string;
  onChangeHeadquartersLocation?: (value: string) => void;
  about?: string;
  onChangeAbout?: (value: string) => void;
  onTriggerEdit?: () => void;
}

export const RecruiterCompanyCard: React.FC<RecruiterCompanyCardProps> = ({
  company: propCompany,
  initialCompany,
  onCompanyChange,
  isEditingDetails = false,
  isSavingDetails = false,
  name: controlledName,
  onChangeName,
  industry: controlledIndustry,
  onChangeIndustry,
  companySize: controlledCompanySize,
  onChangeCompanySize,
  website: controlledWebsite,
  onChangeWebsite,
  headquartersLocation: controlledHeadquartersLocation,
  onChangeHeadquartersLocation,
  about: controlledAbout,
  onChangeAbout,
  onTriggerEdit,
}) => {
  const [internalCompany, setInternalCompany] = useState<Company | null>(
    initialCompany !== undefined ? initialCompany : null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialCompany === undefined && propCompany === undefined,
  );
  const [error, setError] = useState<string | null>(null);

  const effectiveCompany =
    propCompany !== undefined ? propCompany : internalCompany;

  // Uncontrolled fallback states if rendered standalone
  const [localName, setLocalName] = useState<string>("");
  const [localIndustry, setLocalIndustry] = useState<string>("");
  const [localCompanySize, setLocalCompanySize] = useState<string>("");
  const [localWebsite, setLocalWebsite] = useState<string>("");
  const [localHeadquartersLocation, setLocalHeadquartersLocation] =
    useState<string>("");
  const [localAbout, setLocalAbout] = useState<string>("");

  const nameVal = controlledName !== undefined ? controlledName : localName;
  const industryVal =
    controlledIndustry !== undefined ? controlledIndustry : localIndustry;
  const companySizeVal =
    controlledCompanySize !== undefined
      ? controlledCompanySize
      : localCompanySize;
  const websiteVal =
    controlledWebsite !== undefined ? controlledWebsite : localWebsite;
  const headquartersVal =
    controlledHeadquartersLocation !== undefined
      ? controlledHeadquartersLocation
      : localHeadquartersLocation;
  const aboutVal = controlledAbout !== undefined ? controlledAbout : localAbout;

  // Logo Blob state & refs
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState<boolean>(false);
  const [logoVersion, setLocalLogoVersion] = useState<number | undefined>(() =>
    getLogoVersion(),
  );

  const logoObjectUrlRef = useRef<string | null>(null);
  const previousLogoObjectUrlRef = useRef<string | null>(null);

  // Sync logo version across components
  useEffect(() => {
    const handleVersionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setLocalLogoVersion(customEvent.detail);
    };
    window.addEventListener(
      "gigly:recruiter-company-logo-version-updated",
      handleVersionUpdate,
    );
    return () => {
      window.removeEventListener(
        "gigly:recruiter-company-logo-version-updated",
        handleVersionUpdate,
      );
    };
  }, []);

  // Fetch company on mount if not provided as prop
  useEffect(() => {
    if (propCompany !== undefined || initialCompany !== undefined) {
      return;
    }

    let isMounted = true;
    const loadCompany = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getRecruiterCompany();
        if (!isMounted) return;
        setInternalCompany(data);
        if (onCompanyChange) {
          onCompanyChange(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setInternalCompany(null);
        } else {
          setError("Failed to load company profile. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCompany();
    return () => {
      isMounted = false;
    };
  }, [propCompany, initialCompany, onCompanyChange]);

  // Fetch logo blob when company has logo or version updates
  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      if (
        !effectiveCompany?.logoUrl ||
        effectiveCompany.logoUrl.trim() === ""
      ) {
        setLogoObjectUrl(null);
        setIsLoadingLogo(false);
        return;
      }

      setIsLoadingLogo(true);
      try {
        const blob = await fetchRecruiterCompanyLogoBlob(logoVersion);
        if (!isMounted) return;

        if (blob) {
          const newUrl = URL.createObjectURL(blob);
          previousLogoObjectUrlRef.current = logoObjectUrlRef.current;
          logoObjectUrlRef.current = newUrl;
          setLogoObjectUrl(newUrl);
        } else {
          setLogoObjectUrl(null);
          setIsLoadingLogo(false);
        }
      } catch {
        if (isMounted) {
          setLogoObjectUrl(null);
          setIsLoadingLogo(false);
        }
      }
    };

    void loadLogo();
    return () => {
      isMounted = false;
    };
  }, [effectiveCompany?.logoUrl, logoVersion]);

  // Unmount cleanup for Object URLs
  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
        logoObjectUrlRef.current = null;
      }
      if (previousLogoObjectUrlRef.current) {
        URL.revokeObjectURL(previousLogoObjectUrlRef.current);
        previousLogoObjectUrlRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#1877f2]" />
        <span className="text-xs text-slate-500 font-medium ml-2">
          Loading company...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
      {/* Header Row without individual Edit/Save/Cancel controls */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Company</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your organization details, website, headquarters, and branding.
          </p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Empty State: No Company Configured */}
      {!effectiveCompany && !isEditingDetails ? (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
            <Building2 className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">
            No company profile configured yet.
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            Add your company details so candidates can understand your
            organization and hiring mission.
          </p>
          <button
            type="button"
            onClick={onTriggerEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Add Company</span>
          </button>
        </div>
      ) : isEditingDetails ? (
        /* Edit Form */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          {/* Company Name */}
          <div className="sm:col-span-2">
            <label
              htmlFor="company-name"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="company-name"
              type="text"
              value={nameVal}
              onChange={(e) => {
                if (onChangeName) {
                  onChangeName(e.target.value);
                } else {
                  setLocalName(e.target.value);
                }
              }}
              disabled={isSavingDetails}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          {/* Industry */}
          <div>
            <label
              htmlFor="company-industry"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              Industry
            </label>
            <input
              id="company-industry"
              type="text"
              value={industryVal}
              onChange={(e) => {
                if (onChangeIndustry) {
                  onChangeIndustry(e.target.value);
                } else {
                  setLocalIndustry(e.target.value);
                }
              }}
              disabled={isSavingDetails}
              placeholder="e.g. Technology, Healthcare, Finance"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          {/* Company Size */}
          <div>
            <label
              htmlFor="company-size"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              Company Size
            </label>
            <input
              id="company-size"
              type="text"
              value={companySizeVal}
              onChange={(e) => {
                if (onChangeCompanySize) {
                  onChangeCompanySize(e.target.value);
                } else {
                  setLocalCompanySize(e.target.value);
                }
              }}
              disabled={isSavingDetails}
              placeholder="e.g. 50-100 employees"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          {/* Website */}
          <div>
            <label
              htmlFor="company-website"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              Website
            </label>
            <input
              id="company-website"
              type="url"
              value={websiteVal}
              onChange={(e) => {
                if (onChangeWebsite) {
                  onChangeWebsite(e.target.value);
                } else {
                  setLocalWebsite(e.target.value);
                }
              }}
              disabled={isSavingDetails}
              placeholder="e.g. https://example.com"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          {/* Headquarters Location */}
          <div>
            <label
              htmlFor="company-headquarters"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              Headquarters Location
            </label>
            <input
              id="company-headquarters"
              type="text"
              value={headquartersVal}
              onChange={(e) => {
                if (onChangeHeadquartersLocation) {
                  onChangeHeadquartersLocation(e.target.value);
                } else {
                  setLocalHeadquartersLocation(e.target.value);
                }
              }}
              disabled={isSavingDetails}
              placeholder="e.g. New York, NY"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>

          {/* About */}
          <div className="sm:col-span-2">
            <label
              htmlFor="company-about"
              className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
            >
              About the Company
            </label>
            <textarea
              id="company-about"
              rows={3}
              value={aboutVal}
              onChange={(e) => {
                if (onChangeAbout) {
                  onChangeAbout(e.target.value);
                } else {
                  setLocalAbout(e.target.value);
                }
              }}
              disabled={isSavingDetails}
              placeholder="Describe your organization, mission, and company culture..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2] disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="mt-6 space-y-6">
          {/* Logo & Company Title Header Block */}
          <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
            {/* Logo with upload overlay */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white border border-slate-200/90 overflow-hidden flex items-center justify-center shadow-xs">
                {isLoadingLogo ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1877f2]" />
                    <span className="text-[10px] font-medium">Loading...</span>
                  </div>
                ) : logoObjectUrl ? (
                  <img
                    src={logoObjectUrl}
                    alt={effectiveCompany?.name ?? "Company logo"}
                    className="w-full h-full object-cover"
                    onLoad={() => {
                      setIsLoadingLogo(false);
                      if (previousLogoObjectUrlRef.current) {
                        URL.revokeObjectURL(previousLogoObjectUrlRef.current);
                        previousLogoObjectUrlRef.current = null;
                      }
                    }}
                    onError={() => {
                      setLogoObjectUrl(null);
                      setIsLoadingLogo(false);
                    }}
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400" />
                )}
              </div>
            </div>

            {/* Company Name & Summary */}
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {effectiveCompany?.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {effectiveCompany?.industry || "Industry not specified"} •{" "}
                {effectiveCompany?.companySize || "Size not specified"}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Website */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Website
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                {effectiveCompany?.website ? (
                  <a
                    href={effectiveCompany.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1877f2] hover:underline truncate"
                  >
                    {effectiveCompany.website}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">—</span>
                )}
              </div>
            </div>

            {/* Headquarters Location */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Headquarters
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{effectiveCompany?.headquartersLocation || "—"}</span>
              </div>
            </div>

            {/* Industry */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Industry
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{effectiveCompany?.industry || "—"}</span>
              </div>
            </div>

            {/* Company Size */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Company Size
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{effectiveCompany?.companySize || "—"}</span>
              </div>
            </div>

            {/* About */}
            <div className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                About the Company
              </span>
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="whitespace-pre-line leading-relaxed">
                  {effectiveCompany?.about ||
                    "No company description provided yet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterCompanyCard;
