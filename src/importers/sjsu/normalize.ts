import type { ComponentType, Course, Instructor, MeetingMode, Section, TeachingAssignment } from "../../domain/types";

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
    const instructorId = `${input.schoolId}-instructor-${slugify(row.instructor)}`;
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

    instructors.set(instructorId, {
      id: instructorId,
      schoolId: input.schoolId,
      displayName: row.instructor.trim(),
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

    teachingAssignments.push({
      id: `ta-${sectionId}`,
      instructorId,
      sectionId,
      courseId,
      termId: input.termId,
    });
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

  if (value.includes("online")) return "online";
  if (value.includes("hybrid")) return "hybrid";
  if (value.includes("person")) return "in-person";

  return "unknown";
}

function normalizeDays(days: string): string[] {
  const normalized = days.trim().toUpperCase().replaceAll("TH", "R");

  return normalized.length === 0 ? [] : [...normalized];
}

function parseMeetingTime(time: string): [string | undefined, string | undefined] {
  const [startTime, endTime] = time.split("-").map((part) => part.trim());

  return [startTime || undefined, endTime || undefined];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
