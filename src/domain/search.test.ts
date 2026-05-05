import { describe, expect, it } from "vitest";
import { loadDataset } from "../data/loadDataset";
import { findCourse, parseSearchInput } from "./search";

describe("parseSearchInput", () => {
  it("normalizes a valid course-first search", () => {
    const result = parseSearchInput({
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: " cs ",
      courseNumber: " 146 ",
      mode: "in-person",
      days: ["M", "W"],
      startTime: "09:00",
    });

    expect(result).toEqual({
      ok: true,
      query: {
        schoolId: "sjsu",
        termId: "sjsu-2026-fall",
        subject: "CS",
        courseNumber: "146",
        mode: "in-person",
        days: ["M", "W"],
        startTime: "09:00",
      },
    });
  });

  it("returns field-specific errors for missing required input", () => {
    const result = parseSearchInput({
      schoolId: "",
      termId: "",
      subject: "",
      courseNumber: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        schoolId: "Choose a school.",
        termId: "Choose a term.",
        subject: "Enter a subject, such as CS.",
        courseNumber: "Enter a course number, such as 146.",
      },
    });
  });
});

describe("findCourse", () => {
  it("finds a course by normalized subject and number", () => {
    const course = findCourse(loadDataset(), "sjsu", "cs", "146");
    expect(course?.id).toBe("sjsu-cs-146");
  });
});
