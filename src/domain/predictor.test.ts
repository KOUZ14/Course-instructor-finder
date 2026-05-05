import { describe, expect, it } from "vitest";
import type { CourseDataset } from "./types";
import { predictInstructors } from "./predictor";

describe("predictInstructors", () => {
  it("ranks likely instructors with evidence for a course-first SJSU search", () => {
    const response = predictInstructors(sampleDataset(), {
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: "CS",
      courseNumber: "146",
      mode: "in-person",
      days: ["M", "W"],
      startTime: "09:00",
    });

    expect(response.status).toBe("results");
    if (response.status !== "results") return;

    expect(response.results[0]).toMatchObject({
      instructorName: "Taylor Nguyen",
      confidence: "High",
    });
    expect(response.results[0].evidence).toHaveLength(2);
    expect(response.results[0].score).toBeGreaterThan(response.results[1].score);
  });

  it("returns course_not_found when the course is absent", () => {
    const response = predictInstructors(sampleDataset(), {
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: "MATH",
      courseNumber: "999",
    });

    expect(response).toEqual({
      status: "empty",
      reason: "course_not_found",
      message: "MATH 999 is not available in the current dataset.",
    });
  });

  it("returns no_historical_instructor_data when no assignments exist", () => {
    const dataset = sampleDataset();
    const response = predictInstructors(
      {
        ...dataset,
        teachingAssignments: dataset.teachingAssignments.filter((assignment) => assignment.courseId !== "sjsu-cs-151"),
      },
      {
        schoolId: "sjsu",
        termId: "sjsu-2026-fall",
        subject: "CS",
        courseNumber: "151",
      },
    );

    expect(response).toEqual({
      status: "empty",
      reason: "no_historical_instructor_data",
      message: "CS 151 exists, but there is no historical instructor data for it yet.",
    });
  });

  it("throws an explicit error when the target term is absent", () => {
    expect(() =>
      predictInstructors(sampleDataset(), {
        schoolId: "sjsu",
        termId: "sjsu-2099-fall",
        subject: "CS",
        courseNumber: "146",
      }),
    ).toThrow("Target term sjsu-2099-fall is not available in the dataset.");
  });

  it("throws an explicit error for an absent target term before checking course availability", () => {
    expect(() =>
      predictInstructors(sampleDataset(), {
        schoolId: "sjsu",
        termId: "sjsu-2099-fall",
        subject: "MATH",
        courseNumber: "999",
      }),
    ).toThrow("Target term sjsu-2099-fall is not available in the dataset.");
  });

  it("throws an explicit error when the target term belongs to another school", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          terms: dataset.terms.map((term) =>
            term.id === "sjsu-2026-fall" ? { ...term, schoolId: "other-school" } : term,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow("Target term sjsu-2026-fall is not available in the dataset.");
  });

  it("throws an explicit error for an absent target term before checking assignment availability", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          teachingAssignments: dataset.teachingAssignments.filter((assignment) => assignment.courseId !== "sjsu-cs-151"),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2099-fall",
          subject: "CS",
          courseNumber: "151",
        },
      ),
    ).toThrow("Target term sjsu-2099-fall is not available in the dataset.");
  });

  it("throws an explicit error when an assignment references a missing section", () => {
    const dataset = sampleDataset();
    const assignment = dataset.teachingAssignments.find((candidate) => candidate.id === "ta-cs146-fall2025-01");

    expect(assignment).toBeDefined();
    if (!assignment) return;

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          sections: dataset.sections.filter((section) => section.id !== assignment.sectionId),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow(`Assignment ${assignment.id} references missing section ${assignment.sectionId}.`);
  });

  it("throws an explicit error when an assignment references a missing term", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          teachingAssignments: dataset.teachingAssignments.map((assignment) =>
            assignment.id === "ta-cs146-fall2025-01" ? { ...assignment, termId: "missing-term" } : assignment,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow("Assignment ta-cs146-fall2025-01 references missing term missing-term.");
  });

  it("throws an explicit error when an assignment references a missing instructor", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          teachingAssignments: dataset.teachingAssignments.map((assignment) =>
            assignment.id === "ta-cs146-fall2025-01"
              ? { ...assignment, instructorId: "missing-instructor" }
              : assignment,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow("Assignment ta-cs146-fall2025-01 references missing instructor missing-instructor.");
  });

  it("throws an explicit error when a searched-course section has an assignment with a missing course", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          teachingAssignments: dataset.teachingAssignments.map((assignment) =>
            assignment.id === "ta-cs146-fall2025-01" ? { ...assignment, courseId: "missing-course" } : assignment,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow("Assignment ta-cs146-fall2025-01 references missing course missing-course.");
  });

  it("throws an explicit error when a searched-course section has an assignment with the wrong course", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          teachingAssignments: dataset.teachingAssignments.map((assignment) =>
            assignment.id === "ta-cs146-fall2025-01" ? { ...assignment, courseId: "sjsu-cs-151" } : assignment,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow(
      "Assignment ta-cs146-fall2025-01 references section sjsu-cs-146-2025-fall-01 with courseId sjsu-cs-146, but assignment courseId is sjsu-cs-151.",
    );
  });

  it("throws an explicit error when assignment and section course ids differ", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          sections: dataset.sections.map((section) =>
            section.id === "sjsu-cs-146-2025-fall-01" ? { ...section, courseId: "sjsu-cs-151" } : section,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow(
      "Assignment ta-cs146-fall2025-01 references section sjsu-cs-146-2025-fall-01 with courseId sjsu-cs-151, but assignment courseId is sjsu-cs-146.",
    );
  });

  it("throws an explicit error when assignment and section term ids differ", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          sections: dataset.sections.map((section) =>
            section.id === "sjsu-cs-146-2025-fall-01" ? { ...section, termId: "sjsu-2025-spring" } : section,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow(
      "Assignment ta-cs146-fall2025-01 references section sjsu-cs-146-2025-fall-01 with termId sjsu-2025-spring, but assignment termId is sjsu-2025-fall.",
    );
  });

  it("throws an explicit error when referenced course and term schools differ", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          terms: dataset.terms.map((term) =>
            term.id === "sjsu-2025-fall" ? { ...term, schoolId: "other-school" } : term,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow(
      "Assignment ta-cs146-fall2025-01 references course sjsu-cs-146 from school sjsu and term sjsu-2025-fall from school other-school.",
    );
  });

  it("throws an explicit error when referenced course and instructor schools differ", () => {
    const dataset = sampleDataset();

    expect(() =>
      predictInstructors(
        {
          ...dataset,
          instructors: dataset.instructors.map((instructor) =>
            instructor.id === "sjsu-instructor-taylor-nguyen"
              ? { ...instructor, schoolId: "other-school" }
              : instructor,
          ),
        },
        {
          schoolId: "sjsu",
          termId: "sjsu-2026-fall",
          subject: "CS",
          courseNumber: "146",
        },
      ),
    ).toThrow(
      "Assignment ta-cs146-fall2025-01 references course sjsu-cs-146 from school sjsu and instructor sjsu-instructor-taylor-nguyen from school other-school.",
    );
  });

  it("returns cloned evidence days so result mutation does not mutate the dataset", () => {
    const dataset = sampleDataset();
    const response = predictInstructors(dataset, {
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: "CS",
      courseNumber: "146",
      mode: "in-person",
      days: ["M", "W"],
      startTime: "09:00",
    });

    expect(response.status).toBe("results");
    if (response.status !== "results") return;

    const evidence = response.results[0].evidence[0];
    const sourceAssignment = dataset.teachingAssignments.find((assignment) => assignment.id === evidence.assignmentId);
    const sourceSection = dataset.sections.find((section) => section.id === sourceAssignment?.sectionId);

    evidence.days.push("F");

    expect(sourceSection?.days).not.toContain("F");
  });

  it("returns insufficient_evidence when historical assignments score below the threshold", () => {
    const dataset = sampleDataset();
    const response = predictInstructors(
      {
        ...dataset,
        terms: [
          ...dataset.terms,
          {
            id: "sjsu-2030-summer",
            schoolId: "sjsu",
            code: "2030-summer",
            label: "Summer 2030",
            year: 2030,
            season: "summer",
          },
        ],
        sections: dataset.sections.map((section) =>
          section.id === "sjsu-cs-151-2025-fall-01" ? { ...section, componentType: "lab" } : section,
        ),
      },
      {
        schoolId: "sjsu",
        termId: "sjsu-2030-summer",
        subject: "CS",
        courseNumber: "151",
      },
    );

    expect(response).toEqual({
      status: "empty",
      reason: "insufficient_evidence",
      message: "CS 151 has historical data, but not enough evidence for a reliable prediction.",
    });
  });

  it("does not count duplicate day tokens as a meeting pattern match", () => {
    const dataset = sampleDataset();
    const response = predictInstructors(
      {
        ...dataset,
        sections: dataset.sections.map((section) =>
          section.id === "sjsu-cs-151-2025-fall-01" ? { ...section, days: ["T", "T"] } : section,
        ),
      },
      {
        schoolId: "sjsu",
        termId: "sjsu-2026-fall",
        subject: "CS",
        courseNumber: "151",
        days: ["T", "R"],
        startTime: "10:30",
      },
    );

    expect(response.status).toBe("results");
    if (response.status !== "results") return;

    expect(response.results[0].factors.meetingPatternMatch).toBe(0);
  });
});

function sampleDataset(): CourseDataset {
  return {
    schools: [{ id: "sjsu", name: "San Jose State University", sourceAdapter: "sjsu-static-v1" }],
    terms: [
      { id: "sjsu-2026-fall", schoolId: "sjsu", code: "2268", label: "Fall 2026", year: 2026, season: "fall" },
      { id: "sjsu-2025-fall", schoolId: "sjsu", code: "2258", label: "Fall 2025", year: 2025, season: "fall" },
      {
        id: "sjsu-2025-spring",
        schoolId: "sjsu",
        code: "2252",
        label: "Spring 2025",
        year: 2025,
        season: "spring",
      },
      { id: "sjsu-2024-fall", schoolId: "sjsu", code: "2248", label: "Fall 2024", year: 2024, season: "fall" },
    ],
    courses: [
      {
        id: "sjsu-cs-146",
        schoolId: "sjsu",
        subject: "CS",
        number: "146",
        title: "Data Structures and Algorithms",
        courseKey: "CS-146",
      },
      {
        id: "sjsu-cs-151",
        schoolId: "sjsu",
        subject: "CS",
        number: "151",
        title: "Object-Oriented Design",
        courseKey: "CS-151",
      },
    ],
    sections: [
      {
        id: "sjsu-cs-146-2025-fall-01",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2025-fall",
        sectionNumber: "01",
        classNumber: "48291",
        componentType: "lecture",
        mode: "in-person",
        days: ["M", "W"],
        startTime: "09:00",
        endTime: "10:15",
        location: "MacQuarrie Hall",
      },
      {
        id: "sjsu-cs-146-2025-fall-02",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2025-fall",
        sectionNumber: "02",
        classNumber: "48292",
        componentType: "lecture",
        mode: "online",
        days: ["T"],
        startTime: "18:00",
        endTime: "20:45",
        location: "Online",
      },
      {
        id: "sjsu-cs-146-2025-spring-01",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2025-spring",
        sectionNumber: "01",
        classNumber: "28291",
        componentType: "lecture",
        mode: "in-person",
        days: ["M", "W"],
        startTime: "09:00",
        endTime: "10:15",
        location: "MacQuarrie Hall",
      },
      {
        id: "sjsu-cs-146-2024-fall-01",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2024-fall",
        sectionNumber: "01",
        classNumber: "18291",
        componentType: "lecture",
        mode: "in-person",
        days: ["M", "W"],
        startTime: "09:00",
        endTime: "10:15",
        location: "MacQuarrie Hall",
      },
      {
        id: "sjsu-cs-151-2025-fall-01",
        courseId: "sjsu-cs-151",
        termId: "sjsu-2025-fall",
        sectionNumber: "01",
        classNumber: "49291",
        componentType: "lecture",
        mode: "in-person",
        days: ["T", "R"],
        startTime: "10:30",
        endTime: "11:45",
        location: "Duncan Hall",
      },
    ],
    instructors: [
      { id: "sjsu-instructor-taylor-nguyen", schoolId: "sjsu", displayName: "Taylor Nguyen" },
      { id: "sjsu-instructor-rivera-patel", schoolId: "sjsu", displayName: "Rivera Patel" },
      { id: "sjsu-instructor-morgan-lee", schoolId: "sjsu", displayName: "Morgan Lee" },
    ],
    teachingAssignments: [
      {
        id: "ta-cs146-fall2025-01",
        instructorId: "sjsu-instructor-taylor-nguyen",
        sectionId: "sjsu-cs-146-2025-fall-01",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2025-fall",
      },
      {
        id: "ta-cs146-fall2025-02",
        instructorId: "sjsu-instructor-rivera-patel",
        sectionId: "sjsu-cs-146-2025-fall-02",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2025-fall",
      },
      {
        id: "ta-cs146-spring2025-01",
        instructorId: "sjsu-instructor-morgan-lee",
        sectionId: "sjsu-cs-146-2025-spring-01",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2025-spring",
      },
      {
        id: "ta-cs146-fall2024-01",
        instructorId: "sjsu-instructor-taylor-nguyen",
        sectionId: "sjsu-cs-146-2024-fall-01",
        courseId: "sjsu-cs-146",
        termId: "sjsu-2024-fall",
      },
      {
        id: "ta-cs151-fall2025-01",
        instructorId: "sjsu-instructor-morgan-lee",
        sectionId: "sjsu-cs-151-2025-fall-01",
        courseId: "sjsu-cs-151",
        termId: "sjsu-2025-fall",
      },
    ],
  };
}
