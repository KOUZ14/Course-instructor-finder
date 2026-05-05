import type { ComponentType, Course, Instructor, MeetingMode, Section, TeachingAssignment } from "../../domain/types";

const EXPECTED_HEADERS = [
  "Class Nbr",
  "Subject",
  "Catalog",
  "Section",
  "Title",
  "Component",
  "Mode",
  "Days",
  "Time",
  "Location",
  "Instructor",
] as const;

const OFFICIAL_HEADERS = [
  "Section",
  "Class Number",
  "Mode of Instruction",
  "Course Title",
  "Satisfies",
  "Units",
  "Type",
  "Days",
  "Times",
  "Instructor",
  "Location",
  "Dates",
  "Open Seats",
  "Notes",
] as const;

type ScheduleTableShape = "legacy" | "official";

interface ScheduleTableMatch {
  table: HTMLTableElement;
  shape: ScheduleTableShape;
}

export interface SjsuScheduleRow {
  classNumber: string;
  subject: string;
  catalogNumber: string;
  sectionNumber: string;
  title: string;
  component: string;
  mode: string;
  days: string;
  time: string;
  location: string;
  instructor: string;
}

export interface NormalizeSjsuRowsInput {
  schoolId: string;
  termId: string;
  rows: SjsuScheduleRow[];
}

export interface NormalizedSjsuRows {
  courses: Course[];
  sections: Section[];
  instructors: Instructor[];
  teachingAssignments: TeachingAssignment[];
}

/**
 * Parses a saved SJSU-like schedule table into raw schedule rows.
 */
export function parseSjsuScheduleHtml(html: string): SjsuScheduleRow[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const tables = [...document.querySelectorAll("table")];
  const match = findScheduleTable(tables);

  if (!match) {
    if (tables.length === 0) {
      throw new Error("Expected an SJSU schedule table with rows, but none were found.");
    }

    if (tables.some((candidate) => candidate.querySelectorAll("thead th").length > 0)) {
      throw new Error(`Expected SJSU schedule headers ${EXPECTED_HEADERS.join(", ")}.`);
    }

    throw new Error(`Expected an SJSU schedule table with headers ${EXPECTED_HEADERS.join(", ")}.`);
  }

  const rows = [...match.table.querySelectorAll("tbody tr")];

  if (rows.length === 0) {
    throw new Error("Expected an SJSU schedule table with rows, but none were found.");
  }

  return rows.flatMap((row) => {
    const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim() ?? "");

    if (match.shape === "legacy") {
      return [parseLegacyScheduleCells(cells)];
    }

    if (isOfficialNoteRow(cells)) {
      return [];
    }

    return [parseOfficialScheduleCells(cells)];
  });
}

/**
 * Converts raw SJSU schedule rows into universal course entities.
 */
export function normalizeSjsuScheduleRows(input: NormalizeSjsuRowsInput): NormalizedSjsuRows {
  const courses = new Map<string, Course>();
  const instructors = new Map<string, Instructor>();
  const sections: Section[] = [];
  const teachingAssignments: TeachingAssignment[] = [];

  for (const row of input.rows) {
    const subject = row.subject.trim().toUpperCase();
    const number = row.catalogNumber.trim().toUpperCase();
    const sectionNumber = row.sectionNumber.trim();
    const classNumber = row.classNumber.trim();
    const courseId = `${input.schoolId}-${subject.toLowerCase()}-${number.toLowerCase()}`;
    const courseKey = `${subject}-${number}`;
    const sectionId = `${courseId}-${input.termId.replace(`${input.schoolId}-`, "")}-${sectionNumber}-${slugify(classNumber)}`;
    const [startTime, endTime] = parseMeetingTime(row.time);

    courses.set(courseId, {
      id: courseId,
      schoolId: input.schoolId,
      subject,
      number,
      title: row.title.trim(),
      courseKey,
    });

    sections.push({
      id: sectionId,
      courseId,
      termId: input.termId,
      sectionNumber,
      classNumber,
      componentType: normalizeComponent(row.component),
      mode: normalizeMode(row.mode),
      days: normalizeDays(row.days),
      startTime,
      endTime,
      location: row.location.trim(),
    });

    const instructorName = normalizeInstructorName(row.instructor);
    const instructorSlug = slugify(instructorName);

    if (!isPlaceholderInstructor(instructorName) && instructorSlug.length > 0) {
      const instructorId = `${input.schoolId}-instructor-${instructorSlug}`;

      instructors.set(instructorId, {
        id: instructorId,
        schoolId: input.schoolId,
        displayName: instructorName,
      });

      teachingAssignments.push({
        id: `ta-${sectionId}`,
        instructorId,
        sectionId,
        courseId,
        termId: input.termId,
      });
    }
  }

  return {
    courses: [...courses.values()],
    sections,
    instructors: [...instructors.values()],
    teachingAssignments,
  };
}

function normalizeComponent(component: string): ComponentType {
  const value = component.trim().toLowerCase();

  if (value.includes("lecture") || value === "lec") return "lecture";
  if (value.includes("lab") || value === "lab") return "lab";
  if (value.includes("seminar")) return "seminar";
  if (value.includes("activity") || value === "act") return "activity";

  return "unknown";
}

function normalizeMode(mode: string): MeetingMode {
  const value = mode.trim().toLowerCase();

  if (value.includes("hybrid")) return "hybrid";
  if (value.includes("online")) return "online";
  if (value.includes("person")) return "in-person";

  return "unknown";
}

function normalizeDays(days: string): string[] {
  const original = days;
  const normalized = days.trim().toUpperCase();

  if (normalized === "" || normalized === "TBA") {
    return [];
  }

  const tokens: string[] = [];
  let index = 0;

  while (index < normalized.length) {
    const remaining = normalized.slice(index);
    const current = normalized[index];

    if (/\s|,|\//.test(current)) {
      index += 1;
      continue;
    }

    if (remaining.startsWith("TH")) {
      tokens.push("R");
      index += 2;
      continue;
    }

    if (remaining.startsWith("TBA")) {
      index += 3;
      continue;
    }

    if (remaining.startsWith("TU")) {
      tokens.push("T");
      index += 2;
      continue;
    }

    if (["M", "T", "W", "R", "F", "S"].includes(current)) {
      tokens.push(current);
      index += 1;
      continue;
    }

    throw new Error(`Unsupported SJSU day value "${original}".`);
  }

  return [...new Set(tokens)];
}

function parseMeetingTime(time: string): [string | undefined, string | undefined] {
  const normalized = time.trim().toUpperCase();

  if (normalized === "" || normalized === "TBA" || normalized === "-" || isOnlyTbaAndDayTokens(normalized)) {
    return [undefined, undefined];
  }

  const timeRange = extractFirstMeetingTimeRange(time);
  const parts = timeRange.split(/\s*[-\u2013\u2014]\s*/);

  if (parts.length !== 2 || parts.some((part) => part.trim().length === 0)) {
    throw new Error(`Unsupported SJSU meeting time "${time}".`);
  }

  return [parseTimePart(parts[0], time), parseTimePart(parts[1], time)];
}

function extractFirstMeetingTimeRange(time: string): string {
  const match = time.match(/\d{1,2}:\d{2}\s*(?:[AP]M)?\s*[-\u2013\u2014]\s*\d{1,2}:\d{2}\s*(?:[AP]M)?/i);

  if (!match) {
    return time;
  }

  return match[0];
}

function isOnlyTbaAndDayTokens(value: string): boolean {
  return value
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .every((token) => token === "TBA" || ["M", "T", "W", "R", "F", "S", "TU", "TH"].includes(token));
}

function parseTimePart(value: string, original: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);

  if (!match) {
    throw new Error(`Unsupported SJSU meeting time "${original}".`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minute > 59) {
    throw new Error(`Unsupported SJSU meeting time "${original}".`);
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      throw new Error(`Unsupported SJSU meeting time "${original}".`);
    }

    const canonicalHour = meridiem === "AM" ? hour % 12 : (hour % 12) + 12;

    return `${canonicalHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  if (hour > 23) {
    throw new Error(`Unsupported SJSU meeting time "${original}".`);
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function parseLegacyScheduleCells(cells: string[]): SjsuScheduleRow {
  if (cells.length !== EXPECTED_HEADERS.length) {
    throw new Error(`Expected ${EXPECTED_HEADERS.length} schedule columns, received ${cells.length}.`);
  }

  return {
    classNumber: cells[0],
    subject: cells[1],
    catalogNumber: cells[2],
    sectionNumber: cells[3],
    title: cells[4],
    component: cells[5],
    mode: cells[6],
    days: cells[7],
    time: cells[8],
    location: cells[9],
    instructor: cells[10],
  };
}

function parseOfficialScheduleCells(cells: string[]): SjsuScheduleRow {
  if (cells.length !== OFFICIAL_HEADERS.length) {
    throw new Error(`Expected ${OFFICIAL_HEADERS.length} official SJSU schedule columns, received ${cells.length}.`);
  }

  const section = parseOfficialSection(cells[0]);
  const hasShiftedLegacyCells = looksLikeMeetingTime(cells[7]) && !looksLikeMeetingTime(cells[8]);

  if (hasShiftedLegacyCells) {
    return {
      classNumber: cells[1],
      subject: section.subject,
      catalogNumber: section.catalogNumber,
      sectionNumber: section.sectionNumber,
      title: cells[3],
      component: cells[5],
      mode: cells[2],
      days: cells[6],
      time: cells[7],
      location: cells[9],
      instructor: cells[8],
    };
  }

  return {
    classNumber: cells[1],
    subject: section.subject,
    catalogNumber: section.catalogNumber,
    sectionNumber: section.sectionNumber,
    title: cells[3],
    component: cells[6],
    mode: cells[2],
    days: cells[7],
    time: cells[8],
    location: cells[10],
    instructor: cells[9],
  };
}

function looksLikeMeetingTime(value: string): boolean {
  const normalized = value.trim().toUpperCase();

  return (
    normalized === "TBA" ||
    normalized === "-" ||
    /\d{1,2}:\d{2}\s*(?:[AP]M)?\s*[-\u2013\u2014]\s*\d{1,2}:\d{2}/i.test(value)
  );
}

function isOfficialNoteRow(cells: string[]): boolean {
  return cells.length === 1 && cells[0].length > 0;
}

function parseOfficialSection(value: string): { subject: string; catalogNumber: string; sectionNumber: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s+([A-Z0-9]+[A-Z0-9-]*)\s+\(Section\s+([^)]+)\)$/i);

  if (match) {
    return {
      subject: match[1].trim(),
      catalogNumber: match[2].trim(),
      sectionNumber: match[3].trim(),
    };
  }

  const compactMatch = trimmed.match(/^(.+?)\s+([A-Z0-9]+[A-Z0-9-]*)\s*Sec\s+(.+)$/i);

  if (compactMatch) {
    return {
      subject: compactMatch[1].trim(),
      catalogNumber: compactMatch[2].trim(),
      sectionNumber: compactMatch[3].trim(),
    };
  }

  throw new Error(`Unsupported SJSU section value "${value}".`);
}

function findScheduleTable(tables: HTMLTableElement[]): ScheduleTableMatch | undefined {
  for (const table of tables) {
    const headers = [...table.querySelectorAll("thead th")].map((header) => header.textContent?.trim() ?? "");

    if (
      headers.length === EXPECTED_HEADERS.length &&
      EXPECTED_HEADERS.every((expectedHeader, index) => headers[index] === expectedHeader)
    ) {
      return { table, shape: "legacy" };
    }

    if (
      headers.length === OFFICIAL_HEADERS.length &&
      OFFICIAL_HEADERS.every((expectedHeader, index) => headers[index] === expectedHeader)
    ) {
      return { table, shape: "official" };
    }
  }

  return undefined;
}

function isPlaceholderInstructor(instructor: string): boolean {
  const value = instructor.trim().toLowerCase();

  return value === "" || value === "tba" || value === "staff";
}

function normalizeInstructorName(instructor: string): string {
  const names = instructor
    .split("/")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (names.length > 1 && names.every((name) => name === names[0])) {
    return names[0];
  }

  return instructor.trim();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
