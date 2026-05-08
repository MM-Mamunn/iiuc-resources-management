"use client";

import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiHash,
  FiList,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiType,
  FiUser,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
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
  cx,
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

const emptyBulkClassForm = {
  code: "",
  room: "",
  day: "",
  slot: "",
};

const emptyQuickFacultyForm = {
  code: "",
  name: "",
  desig: "",
  email: "",
  phone: "",
};

const FACULTY_SEARCH_MODES = {
  code: {
    label: "Code",
    fieldLabel: "Faculty code",
    helper: "Example: JAA",
    placeholder: "Enter faculty code",
    maxLength: 10,
    suggestionEndpoint: "/api/lookLike/facultyLookLike",
    getSuggestionValue: (faculty) => faculty.code || "",
  },
  name: {
    label: "Name",
    fieldLabel: "Faculty name",
    helper: "Example: Abdullah",
    placeholder: "Enter faculty name",
    maxLength: 80,
    suggestionEndpoint: "/api/lookLike/facultyNameLookLike",
    getSuggestionValue: (faculty) => faculty.name || "",
  },
};

const DAY_OPTIONS = DISPLAY_DAYS.map((day) => ({
  value: DAYS.indexOf(day),
  label: day,
}));

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
  const [classFacultyQuickAddAvailable, setClassFacultyQuickAddAvailable] = useState(false);
  const [facultySearchMode, setFacultySearchMode] = useState("code");
  const [facultyQuery, setFacultyQuery] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultySuggestions, setFacultySuggestions] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulkClassForm);
  const [bulkSuggestions, setBulkSuggestions] = useState({ code: [], room: [] });
  const [bulkLoadingField, setBulkLoadingField] = useState("");
  const [bulkQueue, setBulkQueue] = useState([]);
  const [bulkWarning, setBulkWarning] = useState(null);
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [quickFacultyModal, setQuickFacultyModal] = useState({ open: false, target: "bulk" });
  const [quickFacultyForm, setQuickFacultyForm] = useState(emptyQuickFacultyForm);
  const [quickFacultyNotice, setQuickFacultyNotice] = useState(null);
  const [quickFacultySaving, setQuickFacultySaving] = useState(false);
  const { user } = useAuth();

  const userSection = user?.sec;
  const timeSlots = SLOT_LABELS[shift] ?? SLOT_LABELS[1];
  const slotOptions = getSlotOptions(shift);
  const facultySearchConfig = FACULTY_SEARCH_MODES[facultySearchMode];
  const selectedFacultyCode =
    selectedFaculty?.code ||
    (facultySearchMode === "code" ? facultyQuery.trim().toUpperCase() : "");
  const selectedFacultyLabel = selectedFacultyCode
    ? formatFacultyLabel({ code: selectedFacultyCode, name: selectedFaculty?.name })
    : "Not selected";
  const sessionHelper = activeSessionLoading
    ? "Loading active session..."
    : activeSessionError || (activeSessionName ? `Active: ${activeSessionName}` : "Enter a session");

  useEffect(() => {
    if (activeSessionName) {
      setSession((current) => current || activeSessionName);
    }
  }, [activeSessionName]);

  useEffect(() => {
    if (!hasSearched && userSection) {
      setShift(getShiftFromSection(userSection));
    }
  }, [hasSearched, userSection]);

  useEffect(() => {
    if (
      bulkForm.day === "" ||
      bulkForm.slot === "" ||
      !selectedFacultyCode ||
      !session.trim() ||
      !userSection
    ) {
      setBulkChecking(false);
      setBulkWarning(null);
      return undefined;
    }

    const queuedClass = findQueuedCell(bulkQueue, bulkForm.day, bulkForm.slot);
    if (queuedClass) {
      setBulkChecking(false);
      setBulkWarning({
        type: "error",
        text: `${getDayLabel(bulkForm.day)} slot ${bulkForm.slot} is already queued for ${queuedClass.code}.`,
      });
      return undefined;
    }

    let ignoreResult = false;
    const validateTimer = window.setTimeout(async () => {
      setBulkChecking(true);
      setBulkWarning(null);

      try {
        await api.post("/api/class/validate", {
          session,
          section: userSection,
          faculty: selectedFacultyCode,
          day: bulkForm.day,
          slot: bulkForm.slot,
        });

        if (!ignoreResult) {
          setBulkWarning(null);
        }
      } catch (slotError) {
        if (!ignoreResult) {
          setBulkWarning({ type: "error", text: getClassConflictError(slotError) });
        }
      } finally {
        if (!ignoreResult) {
          setBulkChecking(false);
        }
      }
    }, 250);

    return () => {
      ignoreResult = true;
      window.clearTimeout(validateTimer);
    };
  }, [
    bulkForm.day,
    bulkForm.slot,
    bulkQueue,
    selectedFacultyCode,
    session,
    userSection,
  ]);

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
      if (key === "faculty") {
        setClassFacultyQuickAddAvailable(false);
      }
      return;
    }

    if (key === "faculty") {
      setClassFacultyQuickAddAvailable(false);
    }

    setLoadingField(key);
    try {
      const response = await api.get(`${endpoint}/${encodeURIComponent(value)}`);
      const nextSuggestions = response.data?.rows?.map(mapValue) ?? [];
      setSuggestions((current) => ({ ...current, [key]: nextSuggestions }));
      if (key === "faculty") {
        setClassFacultyQuickAddAvailable(nextSuggestions.length === 0);
      }
    } catch {
      setSuggestions((current) => ({ ...current, [key]: [] }));
      if (key === "faculty") {
        setClassFacultyQuickAddAvailable(false);
      }
    } finally {
      setLoadingField("");
    }
  };

  const chooseSuggestion = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setSuggestions((current) => ({ ...current, [key]: [] }));
    if (key === "faculty") {
      setClassFacultyQuickAddAvailable(false);
    }
  };

  const handleFacultySearchModeChange = (nextMode) => {
    if (nextMode === facultySearchMode) return;

    setFacultySearchMode(nextMode);
    setFacultyQuery("");
    setSelectedFaculty(null);
    setFacultySuggestions([]);
    setBulkQueue([]);
    setBulkForm(emptyBulkClassForm);
    setBulkWarning(null);
  };

  const handleFacultyChange = async (event) => {
    const value = event.target.value;
    setFacultyQuery(value);
    setSelectedFaculty(null);
    setFacultySuggestions([]);
    setBulkQueue([]);
    setBulkWarning(null);

    if (value.length < 1 || value.length > facultySearchConfig.maxLength) {
      return;
    }

    setFacultyLoading(true);
    try {
      const response = await api.get(
        `${facultySearchConfig.suggestionEndpoint}/${encodeURIComponent(value)}`,
      );
      setFacultySuggestions(response.data?.rows ?? []);
    } catch {
      setFacultySuggestions([]);
    } finally {
      setFacultyLoading(false);
    }
  };

  const chooseFaculty = (faculty) => {
    setSelectedFaculty({
      code: faculty.code || "",
      name: faculty.name || "",
    });
    setFacultyQuery(facultySearchConfig.getSuggestionValue(faculty));
    setFacultySuggestions([]);
    setBulkQueue([]);
    setBulkForm(emptyBulkClassForm);
    setBulkWarning(null);
  };

  const openQuickFacultyModal = (target) => {
    const seedValue = target === "bulk" ? facultyQuery.trim() : formData.faculty.trim();
    const seedForm = {
      ...emptyQuickFacultyForm,
      code: target === "bulk" && facultySearchMode === "name" ? "" : seedValue.toUpperCase(),
      name: target === "bulk" && facultySearchMode === "name" ? seedValue : "",
    };

    setQuickFacultyForm(seedForm);
    setQuickFacultyModal({ open: true, target });
    setQuickFacultyNotice(null);
  };

  const closeQuickFacultyModal = () => {
    setQuickFacultyModal({ open: false, target: "bulk" });
    setQuickFacultyForm(emptyQuickFacultyForm);
    setQuickFacultyNotice(null);
    setQuickFacultySaving(false);
  };

  const handleQuickFacultyChange = (field, value) => {
    setQuickFacultyForm((current) => ({
      ...current,
      [field]: field === "code" ? value.toUpperCase() : value,
    }));
    setQuickFacultyNotice(null);
  };

  const handleQuickFacultySubmit = async (event) => {
    event.preventDefault();

    if (!quickFacultyForm.code.trim()) {
      setQuickFacultyNotice({ type: "error", text: "Faculty code is required." });
      return;
    }

    setQuickFacultySaving(true);
    setQuickFacultyNotice(null);

    try {
      const response = await api.post("/api/cr/faculty", getQuickFacultyPayload(quickFacultyForm));
      const savedFaculty = response.data?.row;
      const facultyCode = savedFaculty?.code || quickFacultyForm.code.trim().toUpperCase();

      if (quickFacultyModal.target === "bulk") {
        setSelectedFaculty({
          code: facultyCode,
          name: savedFaculty?.name || quickFacultyForm.name,
        });
        setFacultyQuery(
          facultySearchMode === "name"
            ? savedFaculty?.name || quickFacultyForm.name || facultyCode
            : facultyCode,
        );
        setFacultySuggestions([]);
        setBulkWarning({
          type: "success",
          text: `${formatFacultyLabel(savedFaculty || { code: facultyCode })} is ready for this bulk entry.`,
        });
      } else {
        setFormData((current) => ({ ...current, faculty: facultyCode }));
        setSuggestions((current) => ({ ...current, faculty: [] }));
        setClassFacultyQuickAddAvailable(false);
        setFormError(null);
        setNotice({
          type: "success",
          text: `${formatFacultyLabel(savedFaculty || { code: facultyCode })} added and selected.`,
        });
      }

      closeQuickFacultyModal();
    } catch (facultyError) {
      setQuickFacultyNotice({ type: "error", text: getFacultyError(facultyError) });
    } finally {
      setQuickFacultySaving(false);
    }
  };

  const updateBulkSuggestions = async ({ key, value, endpoint, mapValue, maxLength }) => {
    setBulkForm((current) => ({ ...current, [key]: value }));
    setBulkWarning(null);

    if (value.length < 1 || value.length > maxLength) {
      setBulkSuggestions((current) => ({ ...current, [key]: [] }));
      return;
    }

    setBulkLoadingField(key);
    try {
      const response = await api.get(`${endpoint}/${encodeURIComponent(value)}`);
      const nextSuggestions = response.data?.rows?.map(mapValue) ?? [];
      setBulkSuggestions((current) => ({ ...current, [key]: nextSuggestions }));
    } catch {
      setBulkSuggestions((current) => ({ ...current, [key]: [] }));
    } finally {
      setBulkLoadingField("");
    }
  };

  const chooseBulkSuggestion = (key, value) => {
    setBulkForm((current) => ({ ...current, [key]: value }));
    setBulkSuggestions((current) => ({ ...current, [key]: [] }));
  };

  const updateBulkFormField = (key, value) => {
    setBulkForm((current) => ({ ...current, [key]: value }));
    setBulkWarning(null);
  };

  const handleQueueBulkClass = async (event) => {
    event.preventDefault();

    if (!session.trim()) {
      setBulkWarning({ type: "error", text: "Please enter a session first." });
      return;
    }

    if (!userSection) {
      setBulkWarning({ type: "error", text: "Section not found in user profile." });
      return;
    }

    if (!selectedFacultyCode) {
      setBulkWarning({ type: "error", text: "Choose a faculty from code or name search." });
      return;
    }

    if (!bulkForm.code.trim() || !bulkForm.room.trim() || bulkForm.day === "" || bulkForm.slot === "") {
      setBulkWarning({ type: "error", text: "Course, room, day, and slot are required." });
      return;
    }

    const queuedClass = findQueuedCell(bulkQueue, bulkForm.day, bulkForm.slot);
    if (queuedClass) {
      setBulkWarning({
        type: "error",
        text: `${getDayLabel(bulkForm.day)} slot ${bulkForm.slot} is already queued for ${queuedClass.code}.`,
      });
      return;
    }

    setBulkChecking(true);
    setBulkWarning(null);

    try {
      await api.post("/api/class/validate", {
        session,
        section: userSection,
        faculty: selectedFacultyCode,
        day: bulkForm.day,
        slot: bulkForm.slot,
      });

      setBulkQueue((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          code: bulkForm.code.trim(),
          room: bulkForm.room.trim(),
          day: Number(bulkForm.day),
          slot: Number(bulkForm.slot),
          faculty: selectedFacultyCode,
          facultyName: selectedFaculty?.name || "",
        },
      ]);
      setBulkForm((current) => ({
        ...current,
        slot: "",
      }));
      setBulkSuggestions({ code: [], room: [] });
      setBulkWarning(null);
    } catch (slotError) {
      setBulkWarning({ type: "error", text: getClassConflictError(slotError) });
    } finally {
      setBulkChecking(false);
    }
  };

  const removeQueuedClass = (classId) => {
    setBulkQueue((current) => current.filter((classItem) => classItem.id !== classId));
    setBulkWarning(null);
  };

  const handleBulkSubmit = async () => {
    if (!bulkQueue.length) {
      setBulkWarning({ type: "error", text: "Add at least one class before saving." });
      return;
    }

    setBulkSubmitting(true);
    setBulkWarning(null);

    try {
      const facultyCode = bulkQueue[0]?.faculty || selectedFacultyCode;
      const response = await api.post("/api/class/bulk", {
        session,
        section: userSection,
        faculty: facultyCode,
        id: user?.id || "",
        classes: bulkQueue.map(({ code, room, day, slot }) => ({
          code,
          room,
          day,
          slot,
        })),
      });

      setBulkQueue([]);
      setBulkForm(emptyBulkClassForm);
      setBulkSuggestions({ code: [], room: [] });
      setNotice({
        type: "success",
        text: `${response.data?.inserted || 0} class${response.data?.inserted === 1 ? "" : "es"} added successfully.`,
      });
      await fetchCrRoutine();
    } catch (bulkError) {
      setBulkWarning({ type: "error", text: getClassConflictError(bulkError) });
    } finally {
      setBulkSubmitting(false);
    }
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
    setClassFacultyQuickAddAvailable(false);
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
    setClassFacultyQuickAddAvailable(false);
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

        <section className="mt-8 surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Bulk entry"
            title="Add Faculty Classes"
            description="Select a faculty, queue class cells, and save them together for this section."
          />

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {Object.entries(FACULTY_SEARCH_MODES).map(([mode, config]) => {
                  const Icon = mode === "code" ? FiHash : FiType;
                  const isActive = facultySearchMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleFacultySearchModeChange(mode)}
                      className={cx(
                        "inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        isActive
                          ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"
                          : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {config.label}
                    </button>
                  );
                })}
              </div>

              <FormField
                id="bulk-faculty"
                label={facultySearchConfig.fieldLabel}
                helper={facultyLoading ? "Loading faculty suggestions..." : facultySearchConfig.helper}
                className="mt-4"
              >
                <div className="relative">
                  <FiUser
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="bulk-faculty"
                    name="bulk-faculty"
                    value={facultyQuery}
                    onChange={handleFacultyChange}
                    type="text"
                    autoComplete="off"
                    placeholder={facultySearchConfig.placeholder}
                    className={cx("form-field pl-12", facultySearchMode === "code" && "uppercase")}
                    maxLength={facultySearchConfig.maxLength}
                  />
                  <SuggestionList
                    suggestions={facultySuggestions}
                    getLabel={(faculty) => formatFacultyLabel(faculty)}
                    onSelect={chooseFaculty}
                  />
                </div>
              </FormField>

              {facultyQuery.trim() && !facultyLoading && !selectedFaculty && facultySuggestions.length === 0 && (
                <div className="mt-3 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Faculty not found?
                    </p>
                    <button
                      type="button"
                      onClick={() => openQuickFacultyModal("bulk")}
                      className="btn-secondary"
                    >
                      <FiUserPlus aria-hidden="true" />
                      Add Faculty Quickly
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                      Selected faculty
                    </p>
                    <p className="safe-text mt-1 font-bold text-slate-950 dark:text-white">
                      {selectedFacultyLabel}
                    </p>
                  </div>
                  {selectedFacultyCode && (
                    <FiCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                  )}
                </div>
              </div>

              <form onSubmit={handleQueueBulkClass} className="mt-5 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AutocompleteField
                    id="bulk-code"
                    label="Course code"
                    value={bulkForm.code}
                    placeholder="CSE-1121"
                    loading={bulkLoadingField === "code"}
                    suggestions={bulkSuggestions.code}
                    onChange={(value) =>
                      updateBulkSuggestions({
                        key: "code",
                        value,
                        endpoint: "/api/lookLike/courseLookLike",
                        mapValue: (row) => row.code,
                        maxLength: 15,
                      })
                    }
                    onSelect={(value) => chooseBulkSuggestion("code", value)}
                  />
                  <AutocompleteField
                    id="bulk-room"
                    label="Room"
                    value={bulkForm.room}
                    placeholder="C505"
                    loading={bulkLoadingField === "room"}
                    suggestions={bulkSuggestions.room}
                    onChange={(value) =>
                      updateBulkSuggestions({
                        key: "room",
                        value,
                        endpoint: "/api/lookLike/roomLookLike",
                        mapValue: (row) => row.room,
                        maxLength: 10,
                      })
                    }
                    onSelect={(value) => chooseBulkSuggestion("room", value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="bulk-day" label="Day">
                    <select
                      id="bulk-day"
                      value={bulkForm.day}
                      onChange={(event) => updateBulkFormField("day", event.target.value)}
                      className="form-field capitalize"
                      required
                    >
                      <option value="">Select day</option>
                      {DAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="bulk-slot" label="Slot" helper={bulkChecking ? "Checking availability..." : ""}>
                    <select
                      id="bulk-slot"
                      value={bulkForm.slot}
                      onChange={(event) => updateBulkFormField("slot", event.target.value)}
                      className="form-field"
                      required
                    >
                      <option value="">Select slot</option>
                      {slotOptions.map((slot) => (
                        <option key={slot} value={slot}>
                          Slot {slot} - {getSlotLabel(shift, slot)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {bulkWarning && (
                  <Notice type={bulkWarning.type}>
                    {bulkWarning.text}
                  </Notice>
                )}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="submit"
                    disabled={bulkChecking || !selectedFacultyCode || bulkWarning?.type === "error"}
                    className="btn-secondary"
                  >
                    <FiPlus aria-hidden="true" />
                    Queue class
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={bulkSubmitting || bulkQueue.length === 0}
                    className="btn-primary"
                  >
                    <FiCheckCircle aria-hidden="true" />
                    {bulkSubmitting ? "Saving..." : "Add"}
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Queued classes</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                    {bulkQueue.length} pending
                  </h3>
                </div>
                <FiList className="h-6 w-6 text-slate-400" aria-hidden="true" />
              </div>

              {bulkQueue.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {bulkQueue.map((classItem) => (
                    <article
                      key={classItem.id}
                      className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="safe-text font-bold text-blue-700 dark:text-blue-300">
                            {classItem.code}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {getDayLabel(classItem.day)} · Slot {classItem.slot} · Room {classItem.room}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQueuedClass(classItem.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          aria-label={`Remove ${classItem.code}`}
                          title="Remove class"
                        >
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <FiAlertTriangle className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No queued classes
                  </p>
                </div>
              )}
            </div>
          </div>
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
          onAddFacultyQuick={() => openQuickFacultyModal("class")}
          canAddFacultyQuick={classFacultyQuickAddAvailable}
          submitLabel={isEditMode ? "Update class" : "Add class"}
        />
      )}
      {quickFacultyModal.open && (
        <QuickFacultyModal
          form={quickFacultyForm}
          notice={quickFacultyNotice}
          saving={quickFacultySaving}
          onClose={closeQuickFacultyModal}
          onChange={handleQuickFacultyChange}
          onSubmit={handleQuickFacultySubmit}
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
  onAddFacultyQuick,
  canAddFacultyQuick,
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
            showEmptyAction={canAddFacultyQuick}
            emptyActionLabel="Add Faculty Quickly"
            onEmptyAction={onAddFacultyQuick}
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

function QuickFacultyModal({
  form,
  notice,
  saving,
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="surface-card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            kicker="Quick faculty"
            title="Add Faculty Quickly"
            description="Create the teacher record, then continue routine entry without refreshing."
          />
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3"
            aria-label="Close quick faculty form"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        {notice && (
          <div className="mt-5">
            <Notice type={notice.type}>{notice.text}</Notice>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="quick-faculty-code" label="Faculty code" helper="Required">
              <input
                id="quick-faculty-code"
                value={form.code}
                onChange={(event) => onChange("code", event.target.value)}
                className="form-field uppercase"
                placeholder="JAA"
                autoFocus
                required
              />
            </FormField>
            <FormField id="quick-faculty-name" label="Faculty name">
              <input
                id="quick-faculty-name"
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                className="form-field"
                placeholder="Faculty name"
              />
            </FormField>
          </div>

          <FormField id="quick-faculty-designation" label="Designation">
            <input
              id="quick-faculty-designation"
              value={form.desig}
              onChange={(event) => onChange("desig", event.target.value)}
              className="form-field"
              placeholder="Lecturer"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="quick-faculty-email" label="Email">
              <input
                id="quick-faculty-email"
                value={form.email}
                onChange={(event) => onChange("email", event.target.value)}
                className="form-field"
                placeholder="name@example.com"
                type="email"
              />
            </FormField>
            <FormField id="quick-faculty-phone" label="Phone">
              <input
                id="quick-faculty-phone"
                value={form.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                className="form-field"
                placeholder="+880..."
              />
            </FormField>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <FiUserPlus aria-hidden="true" />
              {saving ? "Adding..." : "Add Faculty"}
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
  showEmptyAction = false,
  emptyActionLabel = "",
  onEmptyAction,
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
        {showEmptyAction && (
          <div className="mt-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3 dark:border-blue-500/40 dark:bg-blue-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                No matching faculty found.
              </p>
              <button type="button" onClick={onEmptyAction} className="btn-secondary">
                <FiUserPlus aria-hidden="true" />
                {emptyActionLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}

function getShiftFromSection(section) {
  return String(section || "").trim().toUpperCase().endsWith("M") ? 1 : 2;
}

function getSlotOptions() {
  return [1, 2, 3, 4, 5, 6];
}

function getSlotLabel(shift, slot) {
  const numericSlot = Number(slot);
  const labels = SLOT_LABELS[shift] ?? SLOT_LABELS[1];
  const labelIndex = shift === 1 && numericSlot >= 4 ? numericSlot : numericSlot - 1;

  return labels[labelIndex] || `Slot ${numericSlot}`;
}

function getDayLabel(day) {
  return DAYS[Number(day)] || "Day";
}

function formatFacultyLabel(faculty) {
  if (!faculty) return "Faculty";

  const code = faculty.code || "";
  const name = faculty.name || "";

  if (code && name) return `${name} (${code})`;
  return code || name || "Faculty";
}

function getQuickFacultyPayload(form) {
  return {
    code: String(form.code || "").trim().toUpperCase(),
    name: String(form.name || "").trim(),
    desig: String(form.desig || "").trim(),
    email: String(form.email || "").trim(),
    phone: String(form.phone || "").trim(),
  };
}

function findQueuedCell(queue, day, slot) {
  return queue.find(
    (classItem) =>
      Number(classItem.day) === Number(day) &&
      Number(classItem.slot) === Number(slot),
  );
}

function getFacultyError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.response?.data?.msg;

  if (message) return message;
  if (status === 400) return "Faculty code is required.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 409) return "Faculty code already exists.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not add faculty.";
}

function getClassConflictError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.response?.data?.error;

  if (message) return message;
  if (status === 409) return "That day and slot is already occupied.";
  if (status === 400) return "Please check the class details.";
  if (status === 404) return "The requested endpoint was not found.";
  if (status === 401) return "Unauthorized. Please login again.";
  if (status === 403) return "Access forbidden.";
  if (status === 500) return "Internal server error.";
  if (error.request) return "Network error: unable to connect to the server.";
  return error.message || "Could not validate the class.";
}

function getSubmitError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.response?.data?.error;

  if (message) return message;
  if (status === 409) return "That class conflicts with an existing routine entry.";
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
