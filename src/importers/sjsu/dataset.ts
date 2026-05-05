import type { CourseDataset, Season } from "../../domain/types";
import { validateCourseDataset } from "../../data/loadDataset";
import { normalizeSjsuScheduleRows, parseSjsuScheduleHtml } from "./normalize";

const SCHOOL_ID = "sjsu";
const SCHOOL_NAME = "San Jose State University";
const SOURCE_ADAPTER = "sjsu-static-v1";
const TERM_SEASON_CODES: Record<Season, string> = {
  winter: "1",
  spring: "2",
  summer: "5",
  fall: "8",
};
const TARGET_TERMS: Array<{ year: number; season: Season }> = [{ year: 2026, season: "fall" }];

export interface SjsuHtmlFileInput {
  filePath: string;
  html: string;
  term: {
    year: number;
    season: Season;
  };
}

/**
 * Builds one validated CourseDataset from saved SJSU schedule HTML files.
 */
export function buildSjsuDatasetFromHtmlFiles(files: SjsuHtmlFileInput[]): CourseDataset {
  if (files.length === 0) {
    throw new Error("Expected at least one SJSU schedule HTML file.");
  }

  const courses = new Map<string, CourseDataset["courses"][number]>();
  const sections = new Map<string, CourseDataset["sections"][number]>();
  const instructors = new Map<string, CourseDataset["instructors"][number]>();
  const teachingAssignments = new Map<string, CourseDataset["teachingAssignments"][number]>();
  const terms = new Map<string, CourseDataset["terms"][number]>();

  for (const targetTerm of TARGET_TERMS) {
    const term = buildTerm(targetTerm.year, targetTerm.season);
    terms.set(term.id, term);
  }

  for (const file of files) {
    const term = buildTerm(file.term.year, file.term.season);
    terms.set(term.id, term);

    const rows = parseRowsWithFileContext(file);
    const normalized = normalizeRowsWithFileContext(file, term.id, rows);

    mergeCourses(courses, normalized.courses, file.filePath);
    mergeUnique(sections, normalized.sections, file.filePath);
    mergeInstructors(instructors, normalized.instructors, file.filePath);
    mergeUnique(teachingAssignments, normalized.teachingAssignments, file.filePath);
  }

  return validateCourseDataset({
    schools: [{ id: SCHOOL_ID, name: SCHOOL_NAME, sourceAdapter: SOURCE_ADAPTER }],
    terms: [...terms.values()].sort((left, right) => right.year - left.year || seasonSortValue(right.season) - seasonSortValue(left.season)),
    courses: [...courses.values()].sort((left, right) => left.courseKey.localeCompare(right.courseKey)),
    sections: [...sections.values()].sort((left, right) => left.id.localeCompare(right.id)),
    instructors: [...instructors.values()].sort((left, right) => left.displayName.localeCompare(right.displayName)),
    teachingAssignments: [...teachingAssignments.values()].sort((left, right) => left.id.localeCompare(right.id)),
  });
}

function normalizeRowsWithFileContext(file: SjsuHtmlFileInput, termId: string, rows: ReturnType<typeof parseSjsuScheduleHtml>) {
  try {
    return normalizeSjsuScheduleRows({
      schoolId: SCHOOL_ID,
      termId,
      rows,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to normalize ${file.filePath}: ${error.message}`);
    }

    throw error;
  }
}

function parseRowsWithFileContext(file: SjsuHtmlFileInput) {
  try {
    return parseSjsuScheduleHtml(file.html);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Expected an SJSU schedule table with rows, but none were found.") {
        console.warn(`Skipping ${file.filePath}: ${error.message}`);
        return [];
      }

      throw new Error(`Failed to parse ${file.filePath}: ${error.message}`);
    }

    throw error;
  }
}

function buildTerm(year: number, season: Season): CourseDataset["terms"][number] {
  return {
    id: `${SCHOOL_ID}-${year}-${season}`,
    schoolId: SCHOOL_ID,
    code: `2${year.toString().slice(-2)}${TERM_SEASON_CODES[season]}`,
    label: `${capitalize(season)} ${year}`,
    year,
    season,
  };
}

function mergeUnique<T extends { id: string }>(target: Map<string, T>, records: T[], sourcePath: string): void {
  for (const record of records) {
    const existing = target.get(record.id);

    if (existing && JSON.stringify(existing) !== JSON.stringify(record)) {
      throw new Error(`Conflicting record id ${record.id} while importing ${sourcePath}.`);
    }

    target.set(record.id, record);
  }
}

function mergeCourses(
  target: Map<string, CourseDataset["courses"][number]>,
  records: CourseDataset["courses"],
  sourcePath: string,
): void {
  for (const record of records) {
    const existing = target.get(record.id);

    if (
      existing &&
      (existing.schoolId !== record.schoolId ||
        existing.subject !== record.subject ||
        existing.number !== record.number ||
        existing.courseKey !== record.courseKey)
    ) {
      throw new Error(`Conflicting course identity for id ${record.id} while importing ${sourcePath}.`);
    }

    if (!existing) {
      target.set(record.id, record);
    }
  }
}

function mergeInstructors(
  target: Map<string, CourseDataset["instructors"][number]>,
  records: CourseDataset["instructors"],
  sourcePath: string,
): void {
  for (const record of records) {
    const existing = target.get(record.id);

    if (existing && existing.schoolId !== record.schoolId) {
      throw new Error(`Conflicting instructor school for id ${record.id} while importing ${sourcePath}.`);
    }

    if (!existing) {
      target.set(record.id, record);
    }
  }
}

function seasonSortValue(season: Season): number {
  switch (season) {
    case "winter":
      return 1;
    case "spring":
      return 2;
    case "summer":
      return 3;
    case "fall":
      return 4;
  }
}

function capitalize(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
