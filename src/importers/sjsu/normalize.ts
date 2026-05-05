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
  const rows = [...document.querySelectorAll("tbody tr")];

  if (rows.length === 0) {
    throw new Error("Expected an SJSU schedule table with rows, but none were found.");
  }

  validateScheduleHeaders(rows[0]);

  return rows.map((row) => {
    const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim() ?? "");

    if (cells.length !== 11) {
      throw new Error(`Expected 11 schedule columns, received ${cells.length}.`);
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
    const courseId = `${input.schoolId}-${subject.toLowerCase()}-${number.toLowerCase()}`;
    const courseKey = `${subject}-${number}`;
    const sectionId = `${courseId}-${input.termId.replace(`${input.schoolId}-`, "")}-${sectionNumber}`;
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
      classNumber: row.classNumber.trim(),
      componentType: normalizeComponent(row.component),
      mode: normalizeMode(row.mode),
      days: normalizeDays(row.days),
      startTime,
      endTime,
      location: row.location.trim(),
    });

    const instructorName = row.instructor.trim();
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

  if (value.includes("lecture")) return "lecture";
  if (value.includes("lab")) return "lab";
  if (value.includes("seminar")) return "seminar";
  if (value.includes("activity")) return "activity";

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

  return tokens;
}

function parseMeetingTime(time: string): [string, string] {
  const parts = time.split(/\s*[-\u2013\u2014]\s*/);

  if (parts.length !== 2 || parts.some((part) => part.trim().length === 0)) {
    throw new Error(`Unsupported SJSU meeting time "${time}".`);
  }

  return [parseTimePart(parts[0], time), parseTimePart(parts[1], time)];
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

function validateScheduleHeaders(row: Element): void {
  const table = row.closest("table");
  const headers = table
    ? [...table.querySelectorAll("thead th")].map((header) => header.textContent?.trim() ?? "")
    : [];

  if (headers.length === 0) {
    return;
  }

  const matchesExpectedHeaders =
    headers.length === EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((expectedHeader, index) => headers[index] === expectedHeader);

  if (!matchesExpectedHeaders) {
    throw new Error(`Expected SJSU schedule headers ${EXPECTED_HEADERS.join(", ")}.`);
  }
}

function isPlaceholderInstructor(instructor: string): boolean {
  const value = instructor.trim().toLowerCase();

  return value === "" || value === "tba" || value === "staff";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
