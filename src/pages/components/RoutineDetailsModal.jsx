"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiHash,
  FiLoader,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import api from "../../api";
import ResourceBrowser from "./ResourceBrowser";
import { EmptyState, Notice, SectionHeading } from "./ui";

function RoutineDetailsModal({ item, title = "Class Details", onClose }) {
  const [lookup, setLookup] = useState(null);
  const [lookupData, setLookupData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const details = useMemo(() => item?.details ?? [], [item]);

  useEffect(() => {
    if (!lookup) {
      setLookupData(null);
      setLookupError("");
      setLookupLoading(false);
      return undefined;
    }

    let ignoreResult = false;

    async function fetchLookupDetails() {
      setLookupLoading(true);
      setLookupError("");
      setLookupData(null);

      try {
        const response =
          lookup.type === "course"
            ? await api.get(`/api/info/course/search/${encodeURIComponent(lookup.code)}`)
            : await api.get(`/api/teacher/search/${encodeURIComponent(lookup.code)}`, {
                params: { limit: 1 },
              });

        if (ignoreResult) return;

        const row = response.data?.rows?.[0] || null;
        if (!row) {
          setLookupError(
            lookup.type === "course"
              ? "Course details were not found."
              : "Faculty details were not found.",
          );
        }
        setLookupData(row);
      } catch {
        if (!ignoreResult) {
          setLookupError(
            lookup.type === "course"
              ? "Could not load course details."
              : "Could not load faculty details.",
          );
        }
      } finally {
        if (!ignoreResult) {
          setLookupLoading(false);
        }
      }
    }

    fetchLookupDetails();

    return () => {
      ignoreResult = true;
    };
  }, [lookup]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <section className="surface-card max-h-[92vh] w-full max-w-5xl animate-enter overflow-y-auto rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            kicker={item.dayLabel || "Routine period"}
            title={title}
            description={getModalSubtitle(item)}
          />
          <button type="button" onClick={onClose} className="btn-secondary px-3" aria-label="Close class details">
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryTile icon={<FiCalendar aria-hidden="true" />} label="Day" value={item.dayLabel || "N/A"} />
          <SummaryTile icon={<FiHash aria-hidden="true" />} label="Slot" value={item.slotStart || item.slot || "N/A"} />
          <SummaryTile icon={<FiMapPin aria-hidden="true" />} label="Room" value={item.room || "N/A"} />
        </div>

        <section className="mt-6">
          {details.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {details.map((detail, index) => (
                <ClassDetailCard
                  key={`${detail.classId || detail.courseCode}-${index}`}
                  detail={detail}
                  onLookup={setLookup}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FiBookOpen className="h-7 w-7" aria-hidden="true" />}
              title="No class details"
              description="This period does not include any detailed class rows."
            />
          )}
        </section>

        {lookup && (
          <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <SectionHeading
                kicker={lookup.type === "course" ? "Course" : "Faculty"}
                title={lookup.label || lookup.code}
              />
              <button type="button" onClick={() => setLookup(null)} className="btn-secondary px-3">
                <FiX aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5">
              {lookupLoading ? (
                <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-4 text-sm font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <FiLoader className="h-5 w-5 animate-spin text-violet-600 dark:text-violet-300" aria-hidden="true" />
                  Loading details...
                </div>
              ) : lookupError ? (
                <Notice inline type="error">{lookupError}</Notice>
              ) : lookup.type === "course" ? (
                <CourseLookupPanel course={lookupData} courseCode={lookup.code} />
              ) : (
                <FacultyLookupPanel faculty={lookupData} />
              )}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="safe-text mt-1 font-bold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ClassDetailCard({ detail, onLookup }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() =>
              onLookup({
                type: "course",
                code: detail.courseCode,
                label: detail.courseCode,
              })
            }
            className="safe-text text-left text-xl font-black text-violet-700 transition hover:text-violet-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300 dark:hover:text-violet-100"
            disabled={!detail.courseCode}
          >
            {detail.courseCode || "Course"}
          </button>
          {detail.courseName && (
            <p className="safe-text mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {detail.courseName}
            </p>
          )}
        </div>
        {detail.section && (
          <span className="status-pill border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
            {detail.section}
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <DetailField label="Room" value={detail.room} />
        <DetailField label="Session" value={detail.session} />
        <DetailField label="Class ID" value={detail.classId} />
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
          <dt className="text-slate-500 dark:text-slate-400">Faculty</dt>
          <dd className="mt-1">
            <button
              type="button"
              onClick={() =>
                onLookup({
                  type: "faculty",
                  code: detail.facultyCode,
                  label: detail.facultyLabel || detail.facultyCode,
                })
              }
              className="safe-text text-left font-bold text-violet-700 transition hover:text-violet-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300 dark:hover:text-violet-100"
              disabled={!detail.facultyCode}
            >
              {detail.facultyLabel || "N/A"}
            </button>
          </dd>
        </div>
      </dl>
    </article>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="safe-text mt-1 font-semibold text-slate-950 dark:text-white">
        {value || "N/A"}
      </dd>
    </div>
  );
}

function CourseLookupPanel({ course, courseCode }) {
  if (!course) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <DetailField label="Title" value={course.title} />
        <DetailField label="Credit" value={course.credit} />
        <DetailField label="Semester" value={course.sem} />
        <DetailField label="Type" value={course.type} />
        <DetailField label="Short name" value={course.short_name} />
        <DetailField label="Prerequisites" value={course.prereq || "None"} />
      </div>
      <ResourceBrowser
        title="Related resources"
        description={`Shared links submitted for ${courseCode}.`}
        courseCode={courseCode}
        framed={false}
        limit={4}
      />
    </div>
  );
}

function FacultyLookupPanel({ faculty }) {
  if (!faculty) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <DetailField label="Code" value={faculty.code} />
      <DetailField label="Name" value={faculty.name} />
      <DetailField label="Designation" value={faculty.desig} />
      <DetailField label="Phone" value={faculty.phone} />
      <DetailField label="Email" value={faculty.email} />
      <DetailField label="Type" value={faculty.type} />
    </div>
  );
}

function getModalSubtitle(item) {
  const pieces = [
    item.subject,
    item.title,
    item.faculty,
    item.room ? `Room ${item.room}` : "",
  ].filter(Boolean);

  return pieces.join(" - ");
}

export default RoutineDetailsModal;
