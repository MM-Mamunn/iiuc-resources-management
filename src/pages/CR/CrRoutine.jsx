"use client";

import { useEffect, useState } from "react";
import { FiCalendar, FiEdit3, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import api from "../../api";
import { useActiveSession, useAuth } from "../../App";
import Header from "../components/Header";
import RoutineTable from "../components/RoutineTable";
import {
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
  SuggestionList,
} from "../components/ui";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DISPLAY_DAYS = ["sat", "sun", "mon", "tue", "wed"];
const SLOT_LABELS = {
  1: [
    "10.30-11.20",
    "11.20-12.10",
    "12.10-1.00",
    "Break",
    "1.40-2.30",
    "2.30-3.20",
    "3.20-4.10",
  ],
  2: [
    "8.20-9.10",
    "9.10-10.00",
    "10.00-10.50",
    "10.50-11.40",
    "11.40-12.30",
    "12.30-1.20",
  ],
};

const emptyClassForm = {
  code: "",
  faculty: "",
  room: "",
  day: "",
  slot: "",
};

/**
 * CR routine editor for adding, editing, and deleting section classes.
 */
const CrRoutine = () => {
  const [schedule, setSchedule] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const {
    activeSessionName,
    activeSessionLoading,
    activeSessionError,
  } = useActiveSession();
  const [session, setSession] = useState("");
  const [sessionSuggestions, setSessionSuggestions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCell, setSelectedCell] = useState({ day: null, slot: null });
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(emptyClassForm);
  const [suggestions, setSuggestions] = useState({ code: [], faculty: [], room: [] });
  const [loadingField, setLoadingField] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState(null);
  const { user } = useAuth();

  const userSection = user?.sec;
  const timeSlots = SLOT_LABELS[shift] ?? SLOT_LABELS[1];
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setSession((current) => current || activeSessionName);
    }
  }, [activeSessionName]);

  const handleSessionChange = async (event) => {
    const value = event.target.value;
    setHasSearched(false);
    setSession(value);

    if (value.length < 1 || value.length > 30) {
      setSessionSuggestions([]);
      return;
    }

    setSessionLoading(true);
    try {
      const response = await api.get(`/api/lookLike/sessionLookLike/${value}`);
      const sessions = response.data?.rows?.map((row) => row.session) ?? [];
      setSessionSuggestions(sessions);
    } catch {
      setSessionSuggestions([]);
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchCrRoutine = async () => {
    const sessionInput = session.toUpperCase().trim();

    if (!userSection) {
      setNotice({ type: "error", text: "Section not found in user profile." });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const response = await api.post(`/api/class/crRoutine/${sessionInput}/${userSection}`, {});
      setSchedule(response.data?.rows ?? []);
      setShift(response.data?.gender || 1);
      setHasSearched(true);
    } catch {
      setSchedule([]);
      setShift(1);
      setHasSearched(true);
      setNotice({ type: "error", text: "Could not load the CR routine." });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSessionSuggestions([]);
    await fetchCrRoutine();
  };

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

  const chooseSuggestion = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setSuggestions((current) => ({ ...current, [key]: [] }));
  };

  const handleAddClass = (day, slot) => {
    setSelectedCell({ day, slot });
    setIsEditMode(false);
    setFormData({
      ...emptyClassForm,
      day: String(day),
      slot: String(slot),
    });
    setShowAddForm(true);
    setFormError(null);
  };

  const handleEditClass = (classItem) => {
    setSelectedCell({ day: classItem.day, slot: classItem.slotStart });
    setIsEditMode(true);
    setFormData({
      code: classItem.subject,
      faculty: classItem.faculty,
      room: classItem.room,
      day: String(classItem.day),
      slot: String(classItem.slotStart),
    });
    setShowAddForm(true);
    setFormError(null);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.post(isEditMode ? "/api/class/update" : "/api/class/new", {
        session,
        section: userSection,
        code: formData.code,
        faculty: formData.faculty,
        room: formData.room,
        day: formData.day,
        slot: formData.slot,
        id: user?.id || "",
      });

      setShowAddForm(false);
      setIsEditMode(false);
      setSuggestions({ code: [], faculty: [], room: [] });
      setNotice({
        type: "success",
        text: isEditMode ? "Class updated successfully." : "Class added successfully.",
      });
      await fetchCrRoutine();
    } catch (submitError) {
      setFormError(getSubmitError(submitError));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteClass = async (classItem) => {
    const confirmDelete = window.confirm(
      `Delete this class?\n\nCourse: ${classItem.subject}\nDay: ${DAYS[classItem.day]}\nSlot: ${classItem.slotStart}`
    );

    if (!confirmDelete) return;

    try {
      await api.post("/api/class/delete", {
        session,
        section: userSection,
        code: classItem.subject,
        day: classItem.day,
        slot: classItem.slotStart,
      });
      setNotice({ type: "success", text: `${classItem.subject} deleted successfully.` });
      await fetchCrRoutine();
    } catch (deleteError) {
      setNotice({ type: "error", text: getDeleteError(deleteError) });
    }
  };

  const generateDaySchedule = (day) => {
    const daySchedule = schedule.filter((item) => item.day === DAYS.indexOf(day));
    const mergedSchedule = [];
    let slot = 1;

    while (slot <= 6) {
      if (shift === 1 && slot === 4) {
        mergedSchedule.push({
          subject: "BREAK",
          colspan: 1,
          isBreak: true,
          slotStart: slot,
          day: DAYS.indexOf(day),
        });
      }

      const classItem = daySchedule.find((item) => Number(item.slot) === slot);
      if (classItem) {
        const count = Number(classItem.count || 1);
        mergedSchedule.push({
          subject: classItem.code,
          faculty: classItem.faculty,
          room: classItem.room,
          classId: classItem.class_id,
          colspan: count,
          slotStart: slot,
          day: DAYS.indexOf(day),
        });
        slot += count;
      } else {
        mergedSchedule.push({
          subject: "-",
          colspan: 1,
          slotStart: slot,
          day: DAYS.indexOf(day),
        });
        slot += 1;
      }
    }

    return mergedSchedule;
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="CR Routine"
            title="Routine Management"
            description={`Manage class schedule for section ${userSection || "N/A"}. Empty cells can be filled directly from the timetable.`}
          />

          <form onSubmit={handleSearch} className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <FormField
              id="session"
              label="Session"
              helper={sessionLoading ? "Loading suggestions..." : sessionHelper}
            >
              <div className="relative">
                <FiCalendar
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="session"
                  name="session"
                  value={session}
                  onChange={handleSessionChange}
                  type="text"
                  placeholder={activeSessionName || "Active session"}
                  className="form-field pl-12"
                />
                <SuggestionList
                  suggestions={sessionSuggestions}
                  onSelect={(suggestion) => {
                    setSession(suggestion);
                    setSessionSuggestions([]);
                  }}
                />
              </div>
            </FormField>
            <button type="submit" disabled={loading || session.length < 1} className="btn-primary">
              <FiSearch aria-hidden="true" />
              {loading ? "Loading..." : "Load routine"}
            </button>
          </form>
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
            icon={<FiCalendar className="h-5 w-5" aria-hidden="true" />}
            label="Session"
            value={session}
            tone="blue"
          />
          <MetricCard
            icon={<FiEdit3 className="h-5 w-5" aria-hidden="true" />}
            label="Section"
            value={userSection || "N/A"}
            tone="teal"
          />
          <MetricCard
            icon={<FiPlus className="h-5 w-5" aria-hidden="true" />}
            label="Loaded classes"
            value={schedule.length}
            tone="amber"
          />
        </section>

        <section className="mt-8">
          {loading ? (
            <LoadingState label="Loading CR routine..." />
          ) : hasSearched ? (
            <RoutineTable
              title={`CR Routine - ${userSection || "Section"}`}
              subtitle={`${session} session`}
              timeSlots={timeSlots}
              displayDays={DISPLAY_DAYS}
              getItemsForDay={generateDaySchedule}
              renderCourseActions={(item) => (
                <>
                  <button
                    type="button"
                    onClick={() => handleEditClass(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`Edit ${item.subject}`}
                    title="Edit class"
                  >
                    <FiEdit3 aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClass(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    aria-label={`Delete ${item.subject}`}
                    title="Delete class"
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </>
              )}
              renderEmptyActions={(item) => (
                <button
                  type="button"
                  onClick={() => handleAddClass(item.day, item.slotStart)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label={`Add class at slot ${item.slotStart}`}
                  title="Add class"
                >
                  <FiPlus aria-hidden="true" />
                </button>
              )}
            />
          ) : (
            <div className="table-shell">
              <EmptyState
                icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
                title="Load a routine"
                description="Choose a session to begin editing your section routine."
              />
            </div>
          )}
        </section>
      </PageShell>

      {showAddForm && (
        <ClassModal
          title={isEditMode ? "Edit Class" : "Add Class"}
          formData={formData}
          selectedCell={selectedCell}
          loadingField={loadingField}
          suggestions={suggestions}
          formError={formError}
          formSubmitting={formSubmitting}
          onClose={() => {
            setShowAddForm(false);
            setIsEditMode(false);
          }}
          onSubmit={handleFormSubmit}
          onChange={updateSuggestions}
          onSelect={chooseSuggestion}
          submitLabel={isEditMode ? "Update class" : "Add class"}
        />
      )}
    </div>
  );
};

/**
 * Modal form used for adding and editing class cells.
 */
function ClassModal({
  title,
  formData,
  selectedCell,
  loadingField,
  suggestions,
  formError,
  formSubmitting,
  onClose,
  onSubmit,
  onChange,
  onSelect,
  submitLabel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading kicker="Class cell" title={title} />
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3"
            aria-label="Close form"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        {formError && (
          <div className="mt-5">
            <Notice type="error">{formError}</Notice>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <AutocompleteField
            id="code"
            label="Course code"
            value={formData.code}
            placeholder="CSE-1121"
            loading={loadingField === "code"}
            suggestions={suggestions.code}
            onChange={(value) =>
              onChange({
                key: "code",
                value,
                endpoint: "/api/lookLike/courseLookLike",
                mapValue: (row) => row.code,
                maxLength: 15,
              })
            }
            onSelect={(value) => onSelect("code", value)}
          />
          <AutocompleteField
            id="faculty"
            label="Faculty"
            value={formData.faculty}
            placeholder="JAA"
            loading={loadingField === "faculty"}
            suggestions={suggestions.faculty}
            onChange={(value) =>
              onChange({
                key: "faculty",
                value,
                endpoint: "/api/lookLike/facultyLookLike",
                mapValue: (row) => row.code,
                maxLength: 10,
              })
            }
            onSelect={(value) => onSelect("faculty", value)}
          />
          <AutocompleteField
            id="room"
            label="Room"
            value={formData.room}
            placeholder="C505"
            loading={loadingField === "room"}
            suggestions={suggestions.room}
            onChange={(value) =>
              onChange({
                key: "room",
                value,
                endpoint: "/api/lookLike/roomLookLike",
                mapValue: (row) => row.room,
                maxLength: 10,
              })
            }
            onSelect={(value) => onSelect("room", value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="day" label="Day">
              <input id="day" value={DAYS[selectedCell.day] || ""} readOnly className="form-field opacity-75" />
            </FormField>
            <FormField id="slot" label="Slot">
              <input id="slot" value={selectedCell.slot || ""} readOnly className="form-field opacity-75" />
            </FormField>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={formSubmitting} className="btn-primary">
              {formSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/**
 * Autocomplete field for class metadata.
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

function getSubmitError(error) {
  const status = error.response?.status;
  if (status === 404) return "The requested endpoint was not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not save class.";
}

function getDeleteError(error) {
  const status = error.response?.status;
  if (status === 404) return "Class not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.response?.data?.message || error.message || "Could not delete class.";
}

export default CrRoutine;
