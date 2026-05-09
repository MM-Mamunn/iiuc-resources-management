import { useEffect, useState } from "react";
import api from "../api";

export const FALLBACK_PERIODS = [
  { no: 1, gender: "male", startTime: "10:40 AM", stopTime: "11:30 AM" },
  { no: 2, gender: "male", startTime: "11:31 AM", stopTime: "12:20 PM" },
  { no: 3, gender: "male", startTime: "12:21 PM", stopTime: "1:10 PM" },
  { no: 4, gender: "male", startTime: "1:50 PM", stopTime: "2:40 PM" },
  { no: 5, gender: "male", startTime: "2:41 PM", stopTime: "3:30 PM" },
  { no: 6, gender: "male", startTime: "3:31 PM", stopTime: "4:20 PM" },
  { no: 1, gender: "female", startTime: "8:20 AM", stopTime: "9:10 AM" },
  { no: 2, gender: "female", startTime: "9:10 AM", stopTime: "10:00 AM" },
  { no: 3, gender: "female", startTime: "10:00 AM", stopTime: "10:50 AM" },
  { no: 4, gender: "female", startTime: "10:50 AM", stopTime: "11:40 AM" },
  { no: 5, gender: "female", startTime: "11:40 AM", stopTime: "12:30 PM" },
  { no: 6, gender: "female", startTime: "12:30 PM", stopTime: "1:20 PM" },
];

export function usePeriods() {
  const [periods, setPeriods] = useState(FALLBACK_PERIODS);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  useEffect(() => {
    let ignoreResult = false;

    async function fetchPeriods() {
      setPeriodsLoading(true);
      try {
        const response = await api.get("/api/period");
        const rows = response.data?.rows?.map(normalizePeriodRow) ?? [];

        if (!ignoreResult && rows.length > 0) {
          setPeriods(rows);
        }
      } catch {
        if (!ignoreResult) {
          setPeriods(FALLBACK_PERIODS);
        }
      } finally {
        if (!ignoreResult) {
          setPeriodsLoading(false);
        }
      }
    }

    fetchPeriods();

    return () => {
      ignoreResult = true;
    };
  }, []);

  return { periods, periodsLoading, setPeriods };
}

export async function listPeriods() {
  const response = await api.get("/api/period");
  return response.data?.rows?.map(normalizePeriodRow) ?? [];
}

export async function updatePeriod({ gender, no, startTime, stopTime }) {
  const response = await api.put(`/api/period/${gender}/${no}`, {
    startTime,
    stopTime,
  });

  return normalizePeriodRow(response.data?.row);
}

export function normalizePeriodRow(row) {
  return {
    no: Number(row?.no),
    gender: String(row?.gender || "").toLowerCase(),
    startTime: row?.startTime || row?.start_time || "",
    stopTime: row?.stopTime || row?.stop_time || "",
  };
}

export function getGenderFromShift(shiftOrGender) {
  if (String(shiftOrGender).toLowerCase() === "male") return "male";
  if (String(shiftOrGender).toLowerCase() === "female") return "female";
  return Number(shiftOrGender) === 1 ? "male" : "female";
}

export function getPeriodsForGender(periods, shiftOrGender) {
  const gender = getGenderFromShift(shiftOrGender);
  const source = periods?.length ? periods : FALLBACK_PERIODS;
  const rows = source
    .map(normalizePeriodRow)
    .filter((period) => period.gender === gender)
    .sort((first, second) => first.no - second.no);

  return rows.length === 6 ? rows : FALLBACK_PERIODS.filter((period) => period.gender === gender);
}

export function getRoutineTimeSlots(periods, shiftOrGender) {
  const gender = getGenderFromShift(shiftOrGender);
  const labels = getPeriodsForGender(periods, gender).map(formatPeriodLabel);

  if (gender === "male") {
    return [...labels.slice(0, 3), "Break", ...labels.slice(3)];
  }

  return labels;
}

export function getPeriodNumbers(periods, shiftOrGender) {
  return getPeriodsForGender(periods, shiftOrGender).map((period) => period.no);
}

export function getPeriodLabel(periods, shiftOrGender, no) {
  const period = getPeriodsForGender(periods, shiftOrGender).find(
    (periodItem) => Number(periodItem.no) === Number(no),
  );

  return period ? formatPeriodLabel(period) : `Period ${no}`;
}

export function formatPeriodLabel(period) {
  return `${period.startTime}-${period.stopTime}`;
}

export function getCurrentRoutineClass(schedule, shiftOrGender, periods, now = new Date()) {
  const currentSlot = getCurrentPeriodSlot(periods, shiftOrGender, now);
  if (!currentSlot) return null;

  const currentDay = now.getDay();

  return (
    schedule
      .filter((item) => Number(item.day) === currentDay)
      .find(
        (item) =>
          currentSlot.no >= Number(item.slot) &&
          currentSlot.no < Number(item.slot) + Number(item.count || 1),
      ) || null
  );
}

export function getCurrentPeriodSlot(periods, shiftOrGender, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return getPeriodsForGender(periods, shiftOrGender).find((period) => {
    const start = timeToMinutes(period.startTime);
    const stop = timeToMinutes(period.stopTime);

    return currentMinutes >= start && currentMinutes <= stop;
  }) || null;
}

export function isValidPeriodRange(startTime, stopTime) {
  const start = timeToMinutes(startTime);
  const stop = timeToMinutes(stopTime);

  return Number.isFinite(start) && Number.isFinite(stop) && start <= stop;
}

export function timeToMinutes(value) {
  const match = String(value || "")
    .trim()
    .match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i);

  if (!match) return Number.NaN;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}
