import api from "../api";

export const FACULTY_SEARCH_MAX_LENGTH = 80;

export function formatFacultyLabel(faculty) {
  if (!faculty) return "Faculty";

  const code = faculty.code || "";
  const name = faculty.name || "";

  if (code && name) return `${name} (${code})`;
  return code || name || "Faculty";
}

export async function fetchFacultySuggestions(query) {
  const searchText = String(query || "").trim();

  if (!searchText || searchText.length > FACULTY_SEARCH_MAX_LENGTH) {
    return [];
  }

  const response = await api.get(
    `/api/lookLike/facultyAnyLookLike/${encodeURIComponent(searchText)}`,
  );

  return response.data?.rows ?? [];
}

export async function searchFaculty(query, { page = 1, limit = 10 } = {}) {
  const searchText = String(query || "").trim();

  if (!searchText) {
    return {
      rows: [],
      pagination: { page, limit, total: 0, totalPages: 1 },
    };
  }

  const response = await api.get(
    `/api/teacher/search-any/${encodeURIComponent(searchText)}`,
    { params: { page, limit } },
  );

  return {
    rows: response.data?.rows ?? [],
    pagination:
      response.data?.pagination ?? {
        page,
        limit,
        total: response.data?.rows?.length ?? 0,
        totalPages: 1,
      },
  };
}

export async function resolveFacultyFromQuery(query) {
  const searchText = String(query || "").trim();

  if (!searchText) return null;

  const { rows } = await searchFaculty(searchText, { page: 1, limit: 8 });
  const exactCode = rows.find(
    (faculty) => faculty.code?.toLowerCase() === searchText.toLowerCase(),
  );
  const exactName = rows.find(
    (faculty) => faculty.name?.toLowerCase() === searchText.toLowerCase(),
  );

  return exactCode || exactName || rows[0] || null;
}
