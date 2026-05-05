import type { Course, CourseDataset, MeetingMode, SearchQuery } from "./types";

export interface RawSearchInput {
  schoolId: string;
  termId: string;
  subject: string;
  courseNumber: string;
  sectionNumber?: string;
  mode?: MeetingMode | "";
  days?: string[];
  startTime?: string;
}

export interface SearchValidationErrors {
  schoolId?: string;
  termId?: string;
  subject?: string;
  courseNumber?: string;
}

export type SearchParseResult =
  | { ok: true; query: SearchQuery }
  | { ok: false; errors: SearchValidationErrors };

/**
 * Normalizes and validates user-entered course search input.
 */
export function parseSearchInput(input: RawSearchInput): SearchParseResult {
  const schoolId = input.schoolId.trim();
  const termId = input.termId.trim();
  const subject = input.subject.trim().toUpperCase();
  const courseNumber = input.courseNumber.trim().toUpperCase();
  const errors: SearchValidationErrors = {};

  if (schoolId.length === 0) errors.schoolId = "Choose a school.";
  if (termId.length === 0) errors.termId = "Choose a term.";
  if (subject.length === 0) errors.subject = "Enter a subject, such as CS.";
  if (courseNumber.length === 0) errors.courseNumber = "Enter a course number, such as 146.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    query: {
      schoolId,
      termId,
      subject,
      courseNumber,
      ...(input.sectionNumber?.trim() ? { sectionNumber: input.sectionNumber.trim() } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.days && input.days.length > 0 ? { days: input.days } : {}),
      ...(input.startTime?.trim() ? { startTime: input.startTime.trim() } : {}),
    },
  };
}

/**
 * Finds a course by school, subject, and number using normalized comparisons.
 */
export function findCourse(
  dataset: CourseDataset,
  schoolId: string,
  subject: string,
  courseNumber: string,
): Course | undefined {
  const normalizedSubject = subject.trim().toUpperCase();
  const normalizedNumber = courseNumber.trim().toUpperCase();

  return dataset.courses.find(
    (course) =>
      course.schoolId === schoolId &&
      course.subject.toUpperCase() === normalizedSubject &&
      course.number.toUpperCase() === normalizedNumber,
  );
}
