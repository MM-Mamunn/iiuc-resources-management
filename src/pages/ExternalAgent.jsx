import { useState, useRef } from "react";
import { FiUploadCloud, FiFileText, FiX, FiCheckCircle, FiLoader, FiAlertCircle, FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiLink, FiBookOpen } from "react-icons/fi";
import api from "../api";
import Header from "./components/Header";
import { PageShell, cx } from "./components/ui";

function ExternalAgent() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [information, setInformation] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
      setSuccess(false);
    } else {
      setError("Please select a valid PDF file.");
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError("");
      setSuccess(false);
    } else if (selectedFile) {
      setError("Please select a valid PDF file.");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setInformation(null);

    const formData = new FormData();
    formData.append("pdf", file); // Adjust field name if needed, assuming "pdf"

    try {
      const response = await api.post("/api/externalagent/info", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.success) {
        setSuccess(true);
        setInformation(response.data.information);
      } else {
        setError("Failed to extract information. Please try again.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.msg || err.message || "An error occurred while uploading the file.";
      if (err.response && err.response.status === 401) {
        setError("Unauthorized: Please log in again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const InfoItem = ({ icon: Icon, label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return (
        <div className="flex flex-col py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-2 mt-1 text-slate-400 dark:text-slate-500 text-sm">
            {Icon && <Icon className="w-4 h-4" />}
            <span>Not provided</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-start gap-2 mt-1 text-slate-800 dark:text-slate-200 text-sm">
          {Icon && <Icon className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" />}
          {Array.isArray(value) ? (
            label === "Skills" ? (
              <div className="flex flex-wrap gap-2">
                {value.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-700/10 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <ul className="list-disc pl-4 space-y-1">
                {value.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )
          ) : (
             <span className="break-words whitespace-pre-wrap">{value}</span>
          )}
        </div>
      </div>
    );
  };

  const LinkItem = ({ icon: Icon, label, url }) => {
    if (!url) return <InfoItem icon={Icon} label={label} value={null} />;
    
    return (
      <div className="flex flex-col py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2 mt-1 text-sm">
          {Icon && <Icon className="w-4 h-4 text-violet-500 shrink-0" />}
          <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 break-all">
            {url}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-8 sm:py-10">
        <section className="mx-auto max-w-3xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="section-kicker">
                <FiUser className="h-3.5 w-3.5" aria-hidden="true" />
                Profile
              </p>
              <h1 className="display-heading mt-3 text-2xl text-slate-950 sm:text-3xl dark:text-white">
                Personalized Information
              </h1>
              <div className="heading-accent-line mt-3 h-0.5 w-16" aria-hidden="true" />
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Upload your resume or profile in PDF format to automatically extract and save your personal information.
              </p>
            </div>
          </div>

          <div className="mt-8 surface-card p-6 sm:p-8">
            <div
              className={cx(
                "relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors text-center",
                isDragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                  : "border-slate-300 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 bg-slate-50 dark:bg-slate-800/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={loading}
              />

              {!file ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300 mb-4">
                    <FiUploadCloud className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Drag and drop your PDF here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-semibold focus:outline-none"
                    >
                      browse
                    </button>
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Only PDF files are supported.</p>
                </>
              ) : (
                <div className="flex items-center gap-4 w-full max-w-md bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    <FiFileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors dark:hover:bg-rose-500/10"
                    title="Remove file"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">Personalized information saved successfully.</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  "Extract & Save"
                )}
              </button>
            </div>
          </div>

          {information && (
            <div className="mt-8 surface-card overflow-hidden animate-enter">
              <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Extracted Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <InfoItem icon={FiUser} label="Name" value={information.name} />
                  <InfoItem icon={FiBriefcase} label="Designation" value={information.designation} />
                  <InfoItem icon={FiMail} label="Email" value={information.email} />
                  <InfoItem icon={FiPhone} label="Phone" value={information.phone} />
                  <InfoItem icon={FiMapPin} label="Address" value={information.address} />
                  
                  <LinkItem icon={FiLink} label="LinkedIn" url={information.linkedin} />
                  <LinkItem icon={FiLink} label="GitHub" url={information.github} />
                  <LinkItem icon={FiLink} label="Website" url={information.website} />
                  <LinkItem icon={FiBookOpen} label="Google Scholar" url={information.google_scholar} />
                </div>
                
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <InfoItem label="About" value={information.about} />
                  <InfoItem label="Skills" value={information.skills} />
                  <InfoItem label="Research Highlights" value={information.research_highlights} />
                  <InfoItem label="Publications" value={information.publications} />
                </div>
              </div>
            </div>
          )}
        </section>
      </PageShell>
    </div>
  );
}

export default ExternalAgent;
