import dataset from "./sjsu-sample-dataset.json";
import type { ComponentType, CourseDataset, MeetingMode, Season } from "../domain/types";

type JsonRecord = Record<string, unknown>;

const seasons = new Set<Season>(["spring", "summer", "fall", "winter"]);
const meetingModes = new Set<MeetingMode>(["in-person", "online", "hybrid", "unknown"]);
const componentTypes = new Set<ComponentType>(["lecture", "lab", "seminar", "activity", "unknown"]);

/**
 * Loads the bundled static course dataset used by the MVP.
 */
export function loadDataset(): CourseDataset {
  return validateCourseDataset(dataset);
}

/**
 * Validates and narrows the bundled JSON fixture to the universal dataset shape.
 */
function validateCourseDataset(value: unknown): CourseDataset {
  const root = assertRecord(value, "dataset");

  return {
    schools: assertArray(root.schools, "schools").map((school, index) => {
      const row = assertRecord(school, `schools[${index}]`);

      return {
        id: assertString(row.id, `schools[${index}].id`),
        name: assertString(row.name, `schools[${index}].name`),
        sourceAdapter: assertString(row.sourceAdapter, `schools[${index}].sourceAdapter`),
      };
    }),
    terms: assertArray(root.terms, "terms").map((term, index) => {
      const row = assertRecord(term, `terms[${index}]`);

      return {
        id: assertString(row.id, `terms[${index}].id`),
        schoolId: assertString(row.schoolId, `terms[${index}].schoolId`),
        code: assertString(row.code, `terms[${index}].code`),
        label: assertString(row.label, `terms[${index}].label`),
        year: assertNumber(row.year, `terms[${index}].year`),
        season: assertEnum(row.season, seasons, `terms[${index}].season`),
      };
    }),
    courses: assertArray(root.courses, "courses").map((course, index) => {
      const row = assertRecord(course, `courses[${index}]`);

      return {
        id: assertString(row.id, `courses[${index}].id`),
        schoolId: assertString(row.schoolId, `courses[${index}].schoolId`),
        subject: assertString(row.subject, `courses[${index}].subject`),
        number: assertString(row.number, `courses[${index}].number`),
        title: assertString(row.title, `courses[${index}].title`),
        courseKey: assertString(row.courseKey, `courses[${index}].courseKey`),
      };
    }),
    sections: assertArray(root.sections, "sections").map((section, index) => {
      const row = assertRecord(section, `sections[${index}]`);

      return {
        id: assertString(row.id, `sections[${index}].id`),
        courseId: assertString(row.courseId, `sections[${index}].courseId`),
        termId: assertString(row.termId, `sections[${index}].termId`),
        sectionNumber: assertString(row.sectionNumber, `sections[${index}].sectionNumber`),
        classNumber: assertOptionalString(row.classNumber, `sections[${index}].classNumber`),
        componentType: assertEnum(row.componentType, componentTypes, `sections[${index}].componentType`),
        mode: assertEnum(row.mode, meetingModes, `sections[${index}].mode`),
        days: assertStringArray(row.days, `sections[${index}].days`),
        startTime: assertOptionalString(row.startTime, `sections[${index}].startTime`),
        endTime: assertOptionalString(row.endTime, `sections[${index}].endTime`),
        location: assertOptionalString(row.location, `sections[${index}].location`),
      };
    }),
    instructors: assertArray(root.instructors, "instructors").map((instructor, index) => {
      const row = assertRecord(instructor, `instructors[${index}]`);

      return {
        id: assertString(row.id, `instructors[${index}].id`),
        schoolId: assertString(row.schoolId, `instructors[${index}].schoolId`),
        displayName: assertString(row.displayName, `instructors[${index}].displayName`),
      };
    }),
    teachingAssignments: assertArray(root.teachingAssignments, "teachingAssignments").map((assignment, index) => {
      const row = assertRecord(assignment, `teachingAssignments[${index}]`);

      return {
        id: assertString(row.id, `teachingAssignments[${index}].id`),
        instructorId: assertString(row.instructorId, `teachingAssignments[${index}].instructorId`),
        sectionId: assertString(row.sectionId, `teachingAssignments[${index}].sectionId`),
        courseId: assertString(row.courseId, `teachingAssignments[${index}].courseId`),
        termId: assertString(row.termId, `teachingAssignments[${index}].termId`),
      };
    }),
  };
}

function assertRecord(value: unknown, path: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected ${path} to be an object.`);
  }

  return value as JsonRecord;
}

function assertArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${path} to be an array.`);
  }

  return value;
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected ${path} to be a string.`);
  }

  return value;
}

function assertOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return assertString(value, path);
}

function assertNumber(value: unknown, path: string): number {
  if (typeof value !== "number") {
    throw new Error(`Expected ${path} to be a number.`);
  }

  return value;
}

function assertEnum<T extends string>(value: unknown, allowedValues: ReadonlySet<T>, path: string): T {
  if (typeof value !== "string" || !allowedValues.has(value as T)) {
    throw new Error(`Expected ${path} to be one of: ${Array.from(allowedValues).join(", ")}.`);
  }

  return value as T;
}

function assertStringArray(value: unknown, path: string): string[] {
  return assertArray(value, path).map((item, index) => assertString(item, `${path}[${index}]`));
}
