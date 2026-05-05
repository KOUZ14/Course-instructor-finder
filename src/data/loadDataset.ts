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
export function validateCourseDataset(value: unknown): CourseDataset {
  const root = assertRecord(value, "dataset");

  const parsedDataset: CourseDataset = {
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

  validateReferences(parsedDataset);

  return parsedDataset;
}

function validateReferences(dataset: CourseDataset): void {
  assertUniqueIds("schools", dataset.schools);
  assertUniqueIds("terms", dataset.terms);
  assertUniqueIds("courses", dataset.courses);
  assertUniqueIds("sections", dataset.sections);
  assertUniqueIds("instructors", dataset.instructors);
  assertUniqueIds("teachingAssignments", dataset.teachingAssignments);

  const schoolIds = new Set(dataset.schools.map((school) => school.id));
  const termsById = new Map(dataset.terms.map((term) => [term.id, term]));
  const coursesById = new Map(dataset.courses.map((course) => [course.id, course]));
  const sectionsById = new Map(dataset.sections.map((section) => [section.id, section]));
  const instructorsById = new Map(dataset.instructors.map((instructor) => [instructor.id, instructor]));

  dataset.courses.forEach((course, index) => {
    assertReferencedIdExists(schoolIds, course.schoolId, `courses[${index}].schoolId`, "school");
  });

  dataset.terms.forEach((term, index) => {
    assertReferencedIdExists(schoolIds, term.schoolId, `terms[${index}].schoolId`, "school");
  });

  dataset.sections.forEach((section, index) => {
    const course = assertReferencedEntityExists(coursesById, section.courseId, `sections[${index}].courseId`, "course");
    const term = assertReferencedEntityExists(termsById, section.termId, `sections[${index}].termId`, "term");

    if (course.schoolId !== term.schoolId) {
      throw new Error(
        `Invalid sections[${index}]: course ${course.id} belongs to school ${course.schoolId} but term ${term.id} belongs to school ${term.schoolId}.`,
      );
    }
  });

  dataset.instructors.forEach((instructor, index) => {
    assertReferencedIdExists(schoolIds, instructor.schoolId, `instructors[${index}].schoolId`, "school");
  });

  dataset.teachingAssignments.forEach((assignment, index) => {
    const instructor = assertReferencedEntityExists(
      instructorsById,
      assignment.instructorId,
      `teachingAssignments[${index}].instructorId`,
      "instructor",
    );
    const section = assertReferencedEntityExists(
      sectionsById,
      assignment.sectionId,
      `teachingAssignments[${index}].sectionId`,
      "section",
    );
    const course = assertReferencedEntityExists(
      coursesById,
      assignment.courseId,
      `teachingAssignments[${index}].courseId`,
      "course",
    );
    const term = assertReferencedEntityExists(
      termsById,
      assignment.termId,
      `teachingAssignments[${index}].termId`,
      "term",
    );

    if (assignment.courseId !== section.courseId) {
      throw new Error(
        `Invalid teachingAssignments[${index}]: courseId ${assignment.courseId} does not match section ${section.id} courseId ${section.courseId}.`,
      );
    }

    if (assignment.termId !== section.termId) {
      throw new Error(
        `Invalid teachingAssignments[${index}]: termId ${assignment.termId} does not match section ${section.id} termId ${section.termId}.`,
      );
    }

    if (course.schoolId !== term.schoolId) {
      throw new Error(
        `Invalid teachingAssignments[${index}]: course ${course.id} belongs to school ${course.schoolId} but term ${term.id} belongs to school ${term.schoolId}.`,
      );
    }

    if (instructor.schoolId !== course.schoolId) {
      throw new Error(
        `Invalid teachingAssignments[${index}]: instructor ${instructor.id} belongs to school ${instructor.schoolId} but section ${section.id} belongs to school ${course.schoolId}.`,
      );
    }
  });
}

function assertUniqueIds(collectionName: string, records: readonly { id: string }[]): void {
  const seenIds = new Set<string>();

  records.forEach((record) => {
    if (seenIds.has(record.id)) {
      throw new Error(`Invalid ${collectionName}: duplicate id ${record.id}.`);
    }

    seenIds.add(record.id);
  });
}

function assertReferencedIdExists(
  ids: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  id: string,
  path: string,
  entityName: string,
): void {
  if (!ids.has(id)) {
    throw new Error(`Invalid ${path}: ${entityName} id ${id} does not exist.`);
  }
}

function assertReferencedEntityExists<T>(
  records: ReadonlyMap<string, T>,
  id: string,
  path: string,
  entityName: string,
): T {
  const record = records.get(id);

  if (!record) {
    throw new Error(`Invalid ${path}: ${entityName} id ${id} does not exist.`);
  }

  return record;
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
