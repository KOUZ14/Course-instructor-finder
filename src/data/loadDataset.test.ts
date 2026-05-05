import { describe, expect, it } from "vitest";
import type { CourseDataset } from "../domain/types";
import { loadDataset, validateCourseDataset } from "./loadDataset";

describe("loadDataset", () => {
  it("loads the bundled SJSU sample dataset with universal entities", () => {
    const dataset = loadDataset();

    expect(dataset.schools).toEqual([
      { id: "sjsu", name: "San Jose State University", sourceAdapter: "sjsu-static-v1" },
    ]);
    expect(dataset.courses.some((course) => course.subject === "CS" && course.number === "146")).toBe(true);
    expect(dataset.teachingAssignments.length).toBeGreaterThan(0);
  });

  it("loads the expected bundled entity counts", () => {
    const dataset = loadDataset();

    expect(dataset.schools).toHaveLength(1);
    expect(dataset.terms).toHaveLength(2);
    expect(dataset.courses).toHaveLength(2558);
    expect(dataset.sections).toHaveLength(6424);
    expect(dataset.instructors).toHaveLength(2192);
    expect(dataset.teachingAssignments).toHaveLength(6230);
  });

  it("loads bundled records with valid references", () => {
    const dataset = loadDataset();
    const schoolIds = new Set(dataset.schools.map((school) => school.id));
    const termIds = new Set(dataset.terms.map((term) => term.id));
    const courseIds = new Set(dataset.courses.map((course) => course.id));
    const sectionIds = new Set(dataset.sections.map((section) => section.id));
    const instructorIds = new Set(dataset.instructors.map((instructor) => instructor.id));

    expect(dataset.courses.every((course) => schoolIds.has(course.schoolId))).toBe(true);
    expect(dataset.terms.every((term) => schoolIds.has(term.schoolId))).toBe(true);
    expect(dataset.sections.every((section) => courseIds.has(section.courseId) && termIds.has(section.termId))).toBe(true);
    expect(dataset.instructors.every((instructor) => schoolIds.has(instructor.schoolId))).toBe(true);
    expect(
      dataset.teachingAssignments.every(
        (assignment) =>
          instructorIds.has(assignment.instructorId) &&
          sectionIds.has(assignment.sectionId) &&
          courseIds.has(assignment.courseId) &&
          termIds.has(assignment.termId),
      ),
    ).toBe(true);
  });

  it("rejects references to missing entities", () => {
    const dataset = cloneBundledDataset();
    dataset.courses[0].schoolId = "missing-school";

    expect(() => validateCourseDataset(dataset)).toThrow(
      "Invalid courses[0].schoolId: school id missing-school does not exist.",
    );
  });

  it("rejects assignments that disagree with their referenced section", () => {
    const dataset = cloneBundledDataset();
    const assignment = dataset.teachingAssignments[0];
    const section = dataset.sections.find((candidate) => candidate.id === assignment.sectionId);
    const otherCourse = dataset.courses.find((candidate) => candidate.id !== section?.courseId);

    expect(section).toBeDefined();
    expect(otherCourse).toBeDefined();
    assignment.courseId = otherCourse?.id ?? assignment.courseId;

    expect(() => validateCourseDataset(dataset)).toThrow(
      `Invalid teachingAssignments[0]: courseId ${otherCourse?.id} does not match section ${section?.id} courseId ${section?.courseId}.`,
    );
  });

  it("rejects duplicate entity ids", () => {
    const dataset = cloneBundledDataset();
    dataset.sections[1].id = dataset.sections[0].id;

    expect(() => validateCourseDataset(dataset)).toThrow(`Invalid sections: duplicate id ${dataset.sections[0].id}.`);
  });

  it("rejects sections whose course and term belong to different schools", () => {
    const dataset = cloneBundledDataset();
    dataset.schools.push({ id: "other-school", name: "Other School", sourceAdapter: "test-adapter" });
    dataset.terms[0].schoolId = "other-school";
    dataset.sections[0].termId = dataset.terms[0].id;

    expect(() => validateCourseDataset(dataset)).toThrow(
      `Invalid sections[0]: course ${dataset.sections[0].courseId} belongs to school sjsu but term ${dataset.terms[0].id} belongs to school other-school.`,
    );
  });

  it("rejects assignments whose referenced entities belong to different schools", () => {
    const dataset = cloneBundledDataset();
    dataset.schools.push({ id: "other-school", name: "Other School", sourceAdapter: "test-adapter" });
    const assignmentIndex = dataset.teachingAssignments.findIndex(
      (assignment) => assignment.instructorId === dataset.instructors[0].id,
    );
    const assignment = dataset.teachingAssignments[assignmentIndex];
    const section = dataset.sections.find((candidate) => candidate.id === assignment.sectionId);
    dataset.instructors[0].schoolId = "other-school";

    expect(() => validateCourseDataset(dataset)).toThrow(
      `Invalid teachingAssignments[${assignmentIndex}]: instructor ${dataset.instructors[0].id} belongs to school other-school but section ${section?.id} belongs to school sjsu.`,
    );
  });
});

function cloneBundledDataset(): CourseDataset {
  return structuredClone(loadDataset());
}
