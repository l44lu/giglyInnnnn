import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Briefcase,
  FileText,
  SquarePen,
  Plus,
  Camera,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getRecruiterCompany,
  updateRecruiterCompany,
  uploadRecruiterCompanyLogo,
  fetchRecruiterCompanyLogoBlob,
  validateLogoFile,
  getLogoVersion,
  setLogoVersion,
  formatNullableField,
} from "@/lib/recruiter-api";
import type { Company, UpdateCompanyPayload } from "@/types/recruiter-profile";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  iconColor: "#1877f2",
});

export interface RecruiterCompanyCardProps {
  initialCompany?: Company | null;
  onCompanyChange?: (company: Company | null) => void;
}

export const RecruiterCompanyCard: React.FC<RecruiterCompanyCardProps> = ({
  initialCompany,
  onCompanyChange,
}) => {
  const [company, setCompany] = useState<Company | null>(
    initialCompany !== undefined ? initialCompany : null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialCompany === undefined,
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form input states
  const [name, setName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [headquartersLocation, setHeadquartersLocation] = useState<string>("");
  const [about, setAbout] = useState<string>("");

  // Logo Blob state & refs
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState<boolean>(false);
  const [logoVersion, setLocalLogoVersion] = useState<number | undefined>(() =>
    getLogoVersion(),
  );

  const logoObjectUrlRef = useRef<string | null>(null);
  const previousLogoObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch company on mount if not provided as initial prop
  useEffect(() => {
    if (initialCompany !== undefined) {
      return;
    }

    let isMounted = true;
    const loadCompany = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getRecruiterCompany();
        if (!isMounted) return;
        setCompany(data);
        if (onCompanyChange) {
          onCompanyChange(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setCompany(null);
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
  }, [initialCompany, onCompanyChange]);

  // Fetch logo blob when company has logo or version updates
  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      if (!company?.logoUrl || company.logoUrl.trim() === "") {
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
  }, [company?.logoUrl, logoVersion]);

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

  const handleStartEditing = () => {
    setName(company?.name ?? "");
    setIndustry(company?.industry ?? "");
    setCompanySize(company?.companySize ?? "");
    setWebsite(company?.website ?? "");
    setHeadquartersLocation(company?.headquartersLocation ?? "");
    setAbout(company?.about ?? "");
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setError(null);
    setIsEditing(false);
  };

  const handleSaveCompany = async () => {
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Company name is required.");
      return;
    }

    const payload: UpdateCompanyPayload = {
      name: trimmedName,
      industry: formatNullableField(industry),
      companySize: formatNullableField(companySize),
      website: formatNullableField(website),
      headquartersLocation: formatNullableField(headquartersLocation),
      about: formatNullableField(about),
    };

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateRecruiterCompany(payload);
      setCompany(updated);
      if (onCompanyChange) {
        onCompanyChange(updated);
      }
      setIsEditing(false);
      void Toast.fire({
        icon: "success",
        title: "Company profile updated successfully",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        setError(msg || "Failed to update company profile. Please try again.");
      } else {
        setError("Failed to update company profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerLogoUpload = () => {
    if (isUploadingLogo) return;
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    e.target.value = "";

    const validationError = validateLogoFile(selectedFile);
    if (validationError) {
      void Toast.fire({
        icon: "error",
        title: validationError,
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const res = await uploadRecruiterCompanyLogo(selectedFile);
      if (company) {
        const updatedCompany: Company = {
          ...company,
          logoUrl: res.logoUrl,
        };
        setCompany(updatedCompany);
        if (onCompanyChange) {
          onCompanyChange(updatedCompany);
        }
      }
      const newVersion = Date.now();
      setLogoVersion(newVersion);
      setLocalLogoVersion(newVersion);
      void Toast.fire({
        icon: "success",
        title: "Company logo updated successfully",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const resData = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(resData?.message)
          ? resData.message.join(", ")
          : resData?.message;
        void Toast.fire({
          icon: "error",
          title: msg || "Failed to upload company logo. Please try again.",
        });
      } else {
        void Toast.fire({
          icon: "error",
          title: "Failed to upload company logo. Please try again.",
        });
      }
    } finally {
      setIsUploadingLogo(false);
    }
  };

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
      {/* Header Row */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Company</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your organization details, website, headquarters, and branding.
          </p>
        </div>

        <div>
          {company && !isEditing && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
              aria-label="Edit Company Details"
            >
              <SquarePen className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveCompany();
                }}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Empty State: No Company Configured */}
      {!company && !isEditing ? (
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
            onClick={handleStartEditing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Add Company</span>
          </button>
        </div>
      ) : isEditing ? (
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Acme Corporation"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
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
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Technology, Healthcare, Finance"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
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
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. 50-100 employees"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
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
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. https://example.com"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
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
              value={headquartersLocation}
              onChange={(e) => setHeadquartersLocation(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. New York, NY"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
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
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              disabled={isSaving}
              placeholder="Describe your organization, mission, and company culture..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#1877f2]"
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
                {isLoadingLogo || isUploadingLogo ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1877f2]" />
                    <span className="text-[10px] font-medium">
                      {isUploadingLogo ? "Uploading..." : "Loading..."}
                    </span>
                  </div>
                ) : logoObjectUrl ? (
                  <img
                    src={logoObjectUrl}
                    alt={company?.name ?? "Company logo"}
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

              {/* Logo Upload Button */}
              <button
                type="button"
                onClick={handleTriggerLogoUpload}
                disabled={isUploadingLogo}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-slate-600 hover:text-[#1877f2] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload company logo"
                title="Upload logo (JPEG, PNG, WebP up to 2MB)"
              >
                <Camera className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  void handleLogoFileChange(e);
                }}
                aria-label="Company logo file input"
              />
            </div>

            {/* Company Name & Summary */}
            <div className="min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {company?.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {company?.industry || "Industry not specified"} •{" "}
                {company?.companySize || "Size not specified"}
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
                {company?.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1877f2] hover:underline truncate"
                  >
                    {company.website}
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
                <span>{company?.headquartersLocation || "—"}</span>
              </div>
            </div>

            {/* Industry */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Industry
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{company?.industry || "—"}</span>
              </div>
            </div>

            {/* Company Size */}
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Company Size
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{company?.companySize || "—"}</span>
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
                  {company?.about || "No company description provided yet."}
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
