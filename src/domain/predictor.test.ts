import { describe, expect, it } from "vitest";
import { loadDataset } from "../data/loadDataset";
import { predictInstructors } from "./predictor";

describe("predictInstructors", () => {
  it("ranks likely instructors with evidence for a course-first SJSU search", () => {
    const response = predictInstructors(loadDataset(), {
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
    const response = predictInstructors(loadDataset(), {
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
    const dataset = loadDataset();
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
});
