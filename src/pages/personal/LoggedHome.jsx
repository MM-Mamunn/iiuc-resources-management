"use client";

import { useEffect, useState } from "react";
import { FiCalendar, FiCheckCircle, FiGrid, FiPlus, FiUser } from "react-icons/fi";
import api from "../../api";
import Header from "../components/Header";
import {
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "../components/ui";

const initialFormData = {
  session: "",
  section: "",
  code: "",
  faculty: "",
  room: "",
  day: "",
  slot: "",
};

/**
 * Class-entry screen used by authorized contributors and CR workflows.
 */
function LoggedHome() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [suggestions, setSuggestions] = useState({
    session: [],
    section: [],
    faculty: [],
    code: [],
    room: [],
  });
  const [loadingField, setLoadingField] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [lastSubmittedData, setLastSubmittedData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setNotice(null);
      try {
        const response = await api.get("/api/user/profile");
        setProfile(response.data?.[0] || null);
      } catch (profileError) {
        setNotice({
          type: "error",
          text: profileError.message || "Could not load profile.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const updateSuggestions = async ({ key, value, endpoint, mapValue, maxLength }) => {
    setFormData((current) => ({ ...current, [key]: value }));

    if (value.length < 1 || value.length > maxLength) {
      setSuggestions((current) => ({ ...current, [key]: [] }));
      return;
    }

    setLoadingField(key);
    try {
      const response = await api.get(`${endpoint}/${value}`);
      const nextSuggestions = response.data?.rows?.map(mapValue) ?? [];
      setSuggestions((current) => ({ ...current, [key]: nextSuggestions }));
    } catch {
      setSuggestions((current) => ({ ...current, [key]: [] }));
    } finally {
      setLoadingField("");
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const chooseSuggestion = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setSuggestions((current) => ({ ...current, [key]: [] }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setFormSubmitting(true);
    setNotice(null);

    try {
      const submitData = {
        ...formData,
        id: profile?.id || "",
      };

      await api.post("/api/class/new", submitData);
      setNotice({ type: "success", text: "Schedule created successfully." });
      setLastSubmittedData({
        ...submitData,
        submittedAt: new Date().toLocaleString(),
      });
      setFormData(initialFormData);
    } catch (submitError) {
      setNotice({ type: "error", text: getSubmitError(submitError) });
    } finally {
      setFormSubmitting(false);
      setSuggestions({
        session: [],
        section: [],
        faculty: [],
        code: [],
        room: [],
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Create class"
            title="Enter Class Schedule"
            description="Add a class with guided suggestions for session, section, course, faculty, and room."
          />
        </section>

        {notice && (
          <div className="mt-6">
            <Notice type={notice.type} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Notice>
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiUser className="h-5 w-5" aria-hidden="true" />}
            label="Contributor"
            value={profile?.name || profile?.id || "Loading"}
            tone="blue"
          />
          <MetricCard
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={formData.session || "Not set"}
            tone="teal"
          />
          <MetricCard
            icon={<FiGrid className="h-5 w-5" aria-hidden="true" />}
            label="Section"
            value={formData.section || "Not set"}
            tone="amber"
          />
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="surface-card p-5">
            {loading ? (
              <LoadingState label="Loading profile..." />
            ) : (
              <form onSubmit={handleFormSubmit} className="grid gap-5" autoComplete="off">
                <AutocompleteField
                  id="session"
                  label="Session"
                  value={formData.session}
                  placeholder="Spring-26"
                  loading={loadingField === "session"}
                  suggestions={suggestions.session}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "session",
                      value,
                      endpoint: "/api/lookLike/sessionLookLike",
                      mapValue: (row) => row.session,
                      maxLength: 30,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("session", value)}
                />

                <AutocompleteField
                  id="section"
                  label="Section"
                  value={formData.section}
                  placeholder="1AM"
                  loading={loadingField === "section"}
                  suggestions={suggestions.section}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "section",
                      value,
                      endpoint: "/api/lookLike/sectionLookLike",
                      mapValue: (row) => row.sec,
                      maxLength: 4,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("section", value)}
                />

                <AutocompleteField
                  id="code"
                  label="Course code"
                  value={formData.code}
                  placeholder="CSE-1121"
                  loading={loadingField === "code"}
                  suggestions={suggestions.code}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "code",
                      value,
                      endpoint: "/api/lookLike/courseLookLike",
                      mapValue: (row) => row.code,
                      maxLength: 15,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("code", value)}
                />

                <AutocompleteField
                  id="faculty"
                  label="Faculty"
                  value={formData.faculty}
                  placeholder="JAA"
                  loading={loadingField === "faculty"}
                  suggestions={suggestions.faculty}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "faculty",
                      value,
                      endpoint: "/api/lookLike/facultyLookLike",
                      mapValue: (row) => row.code,
                      maxLength: 10,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("faculty", value)}
                />

                <AutocompleteField
                  id="room"
                  label="Room"
                  value={formData.room}
                  placeholder="C505"
                  loading={loadingField === "room"}
                  suggestions={suggestions.room}
                  onChange={(value) =>
                    updateSuggestions({
                      key: "room",
                      value,
                      endpoint: "/api/lookLike/roomLookLike",
                      mapValue: (row) => row.room,
                      maxLength: 10,
                    })
                  }
                  onSelect={(value) => chooseSuggestion("room", value)}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="day" label="Day">
                    <select
                      id="day"
                      name="day"
                      value={formData.day}
                      onChange={handleInputChange}
                      className="form-field"
                      required
                    >
                      <option value="">Select day</option>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </FormField>

                  <FormField id="slot" label="Slot">
                    <select
                      id="slot"
                      name="slot"
                      value={formData.slot}
                      onChange={handleInputChange}
                      className="form-field"
                      required
                    >
                      <option value="">Select slot</option>
                      <option value="1">Slot 1</option>
                      <option value="2">Slot 2</option>
                      <option value="3">Slot 3</option>
                      <option value="4">Slot 4</option>
                      <option value="5">Slot 5</option>
                      <option value="6">Slot 6</option>
                    </select>
                  </FormField>
                </div>

                <button type="submit" disabled={formSubmitting} className="btn-primary">
                  <FiPlus aria-hidden="true" />
                  {formSubmitting ? "Creating..." : "Create schedule"}
                </button>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            <div className="surface-card p-5">
              <SectionHeading kicker="Profile" title="Contributor" />
              <div className="mt-5 space-y-3 text-sm">
                <InfoRow label="ID" value={profile?.id || "N/A"} />
                <InfoRow label="Name" value={profile?.name || "N/A"} />
                <InfoRow label="Section" value={profile?.sec || "N/A"} />
              </div>
            </div>

            {lastSubmittedData && (
              <div className="surface-card p-5">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
                  <FiCheckCircle className="h-5 w-5" aria-hidden="true" />
                  <h2 className="font-bold">Last submitted</h2>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  {Object.entries(lastSubmittedData).map(([key, value]) => (
                    <InfoRow key={key} label={key} value={value} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </PageShell>
    </div>
  );
}

/**
 * Reusable autocomplete input used by the class-entry form.
 */
function AutocompleteField({
  id,
  label,
  value,
  placeholder,
  loading,
  suggestions,
  onChange,
  onSelect,
}) {
  return (
    <FormField id={id} label={label} helper={loading ? "Loading suggestions..." : ""}>
      <div className="relative">
        <input
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          type="text"
          placeholder={placeholder}
          className="form-field"
          required
        />
        <SuggestionList suggestions={suggestions} onSelect={onSelect} />
      </div>
    </FormField>
  );
}

/**
 * Side-panel label/value row.
 */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <span className="capitalize text-slate-500 dark:text-slate-400">{label}</span>
      <span className="safe-text text-right font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </span>
    </div>
  );
}

function getSubmitError(error) {
  const status = error.response?.status;
  if (status === 404) return "The requested endpoint was not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 500) return "Internal server error. Please try again later.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not create schedule.";
}

export default LoggedHome;
