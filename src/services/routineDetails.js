export function splitRoutineValue(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitRoutineValue(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueClean(values) {
  const seen = new Set();

  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function joinRoutineValues(values, fallback = "") {
  const cleaned = uniqueClean(values);
  return cleaned.length ? cleaned.join(", ") : fallback;
}

export function formatFacultyName({ facultyCode, facultyName }) {
  if (facultyCode && facultyName) return `${facultyName} (${facultyCode})`;
  return facultyName || facultyCode || "";
}

export function getRoutineClassDetails(classItem, defaults = {}) {
  const courseCodes = splitRoutineValue(classItem?.code ?? classItem?.subject);
  const sections = splitRoutineValue(classItem?.sec ?? classItem?.section);
  const facultyCodes = splitRoutineValue(classItem?.faculty);
  const facultyNames = splitRoutineValue(
    classItem?.name ?? classItem?.facultyName ?? classItem?.faculty_name,
  );
  const rooms = splitRoutineValue(classItem?.room);
  const shortNames = splitRoutineValue(classItem?.short_name ?? classItem?.title);
  const classIds = splitRoutineValue(classItem?.class_id ?? classItem?.classId);
  const itemCount = Math.max(
    courseCodes.length,
    sections.length,
    facultyCodes.length,
    facultyNames.length,
    rooms.length,
    shortNames.length,
    classIds.length,
    1,
  );

  return Array.from({ length: itemCount }, (_, index) => {
    const facultyCode = facultyCodes[index] || facultyCodes[0] || "";
    const facultyName = facultyNames[index] || facultyNames[0] || "";

    return {
      classId: classIds[index] || "",
      courseCode: courseCodes[index] || courseCodes[0] || "",
      courseName: shortNames[index] || shortNames[0] || "",
      section: sections[index] || sections[0] || defaults.section || "",
      facultyCode,
      facultyName,
      facultyLabel: formatFacultyName({ facultyCode, facultyName }),
      room: rooms[index] || rooms[0] || "",
      session: defaults.session || classItem?.session || "",
      day: defaults.day ?? classItem?.day ?? "",
      dayLabel: defaults.dayLabel || "",
      slot: defaults.slot ?? classItem?.slot ?? classItem?.slotStart ?? "",
    };
  }).filter(
    (detail) =>
      detail.courseCode ||
      detail.section ||
      detail.facultyCode ||
      detail.facultyName ||
      detail.room,
  );
}

export function summarizeRoutineDetails(details, fallback = {}) {
  const courseCodes = details.map((detail) => detail.courseCode);
  const courseNames = details.map((detail) => detail.courseName);
  const rooms = details.map((detail) => detail.room);
  const faculties = details.map((detail) => detail.facultyLabel);

  return {
    subject: joinRoutineValues(courseCodes, fallback.subject || "Course"),
    title: joinRoutineValues(courseNames, fallback.title || ""),
    room: joinRoutineValues(rooms, fallback.room || ""),
    faculty: joinRoutineValues(faculties, fallback.faculty || ""),
  };
}
